const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const AttendanceRecord = require('../models/AttendanceRecord');
const LeaveRequest = require('../models/LeaveRequest');
const FieldReport = require('../models/FieldReport');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getDistanceInMeters } = require('../utils/haversine');
const { sendSuccess, sendError } = require('../utils/response');
const { ROLES } = require('../utils/constants');

const TOTAL_LEAVES_PER_YEAR = 12;
const WORKER_LEAVE_TYPES = ['SICK', 'CASUAL', 'EMERGENCY'];

function parseBodyDate(str) {
  if (!str) return null;
  const ymd = String(str).split('T')[0];
  const parts = ymd.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return new Date(str);
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function leaveSpanDays(fromDate, toDate) {
  return Math.ceil((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)) + 1;
}

function sumApprovedLeaveDays(leaves) {
  return leaves
    .filter((l) => l.status === 'APPROVED')
    .reduce((sum, l) => sum + leaveSpanDays(l.fromDate, l.toDate), 0);
}

function startEndOfToday() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function startOfLast7Days() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getDashboardData(req, res, next) {
  try {
    const workerId = req.user.userId;
    const oid = new mongoose.Types.ObjectId(workerId);
    const { start, end } = startEndOfToday();
    const weekFrom = startOfLast7Days();

    const [
      todayTask,
      todayAttendance,
      weeklyAttendanceCount,
      totalTasksThisWeek,
      pendingLeaveCount,
      attRecords,
      leaves,
      reports,
    ] = await Promise.all([
      Task.findOne({
        assignedWorkers: oid,
        date: { $gte: start, $lte: end },
        status: 'ACTIVE',
        isDeleted: false,
      })
        .populate('createdBy', 'fullName')
        .lean(),

      AttendanceRecord.findOne({
        worker: oid,
        checkInTime: { $exists: true, $ne: null, $gte: start, $lte: end },
        isDeleted: false,
      })
        .sort({ checkInTime: -1 })
        .lean(),

      AttendanceRecord.countDocuments({
        worker: oid,
        checkInTime: { $gte: weekFrom },
        status: 'VERIFIED',
        isDeleted: false,
      }),

      Task.countDocuments({
        assignedWorkers: oid,
        date: { $gte: weekFrom },
        isDeleted: false,
      }),

      LeaveRequest.countDocuments({
        worker: oid,
        status: 'PENDING',
      }),

      AttendanceRecord.find({ worker: oid, isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate('task', 'title')
        .lean(),

      LeaveRequest.find({ worker: oid }).sort({ createdAt: -1 }).limit(3).lean(),

      FieldReport.find({ worker: oid }).sort({ createdAt: -1 }).limit(3).populate('task', 'title').lean(),
    ]);

    const attendanceItems = attRecords.map((r) => ({
      type: 'ATTENDANCE',
      status: r.status,
      time: r.checkInTime || r.createdAt,
      label: r.task?.title || 'Attendance',
      flagReasons: r.flagReasons || [],
    }));

    const leaveItems = leaves.map((l) => ({
      type: 'LEAVE',
      status: l.status,
      time: l.createdAt,
      label: 'Leave Request',
    }));

    const reportItems = reports.map((r) => ({
      type: 'REPORT',
      status: r.status,
      time: r.createdAt,
      label: r.task?.title || 'Report',
    }));

    const merged = [...attendanceItems, ...leaveItems, ...reportItems].sort(
      (a, b) => new Date(b.time) - new Date(a.time)
    );
    const recentActivity = merged.slice(0, 5);

    return sendSuccess(
      res,
      {
        todayTask,
        todayAttendance,
        weeklyAttendanceCount,
        totalTasksThisWeek,
        pendingLeaveCount,
        recentActivity,
      },
      'Dashboard data'
    );
  } catch (err) {
    next(err);
  }
}

async function getTodayAttendance(req, res, next) {
  try {
    const workerId = req.user.userId;
    const oid = new mongoose.Types.ObjectId(workerId);
    const { start, end } = startEndOfToday();

    const record = await AttendanceRecord.findOne({
      worker: oid,
      checkInTime: { $exists: true, $ne: null, $gte: start, $lte: end },
      isDeleted: false,
    })
      .sort({ checkInTime: -1 })
      .lean();

    return sendSuccess(res, record, 'Today attendance');
  } catch (err) {
    next(err);
  }
}

function checkWindowAgainstTimeStr(timeStr, bufferMinutes, now, outsideReason) {
  const parts = String(timeStr || '').split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  if (Number.isNaN(h)) {
    return { timeValid: false, reason: outsideReason };
  }
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  const allowedFrom = new Date(base.getTime() - bufferMinutes * 60000);
  const allowedTo = new Date(base.getTime() + bufferMinutes * 60000);
  const timeValid = now >= allowedFrom && now <= allowedTo;
  return { timeValid, reason: timeValid ? '' : outsideReason };
}

async function verifyFaceWithPythonService(faceFilePath, userId) {
  const baseUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';
  try {
    const form = new FormData();
    form.append('image', fs.createReadStream(faceFilePath));
    form.append('userId', String(userId));
    const resp = await axios.post(`${baseUrl}/verify-face`, form, {
      headers: form.getHeaders(),
      timeout: 45000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    const match = resp.data?.match === true || resp.data?.match === 'true';
    if (!match) {
      return { faceValid: false, reason: 'Face did not match registered photo' };
    }
    return { faceValid: true, reason: '' };
  } catch (err) {
    return { faceValid: false, reason: 'Face verification service unavailable' };
  }
}

function fieldImageRelativePath(file) {
  if (!file?.filename) return '';
  return `attendance/${file.filename}`;
}

async function checkIn(req, res, next) {
  try {
    const workerId = req.user.userId;
    const oid = new mongoose.Types.ObjectId(workerId);
    const faceFile = req.files?.faceImage?.[0];
    const fieldFile = req.files?.fieldImage?.[0];
    if (!faceFile || !fieldFile) {
      return sendError(res, 'faceImage and fieldImage are required', 400);
    }

    const { taskId, latitude, longitude } = req.body;
    if (!taskId || latitude === undefined || longitude === undefined) {
      return sendError(res, 'taskId, latitude, and longitude are required', 400);
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return sendError(res, 'Invalid latitude or longitude', 400);
    }

    const task = await Task.findOne({
      _id: taskId,
      assignedWorkers: oid,
      status: 'ACTIVE',
      isDeleted: false,
    });

    if (!task) {
      return sendError(res, 'Task not found or not assigned to you', 404);
    }

    const { start, end } = startEndOfToday();
    const duplicate = await AttendanceRecord.findOne({
      worker: oid,
      task: taskId,
      checkInTime: { $exists: true, $ne: null, $gte: start, $lte: end },
      isDeleted: false,
    });
    if (duplicate) {
      return sendError(res, 'Already checked in for this task today', 400);
    }

    const now = new Date();
    const bufferIn = task.checkInBuffer ?? 15;
    const timeCheck = checkWindowAgainstTimeStr(
      task.startTime,
      bufferIn,
      now,
      'Check-in outside allowed time window'
    );
    const timeValid = timeCheck.timeValid;
    const timeReason = timeCheck.reason;

    const distance = getDistanceInMeters(lat, lon, task.latitude, task.longitude);
    let locationValid = true;
    let locationReason = '';
    if (distance > task.allowedRadius) {
      locationValid = false;
      locationReason = `Location too far from task site (${Math.round(distance)}m away, limit: ${task.allowedRadius}m)`;
    }

    const faceResult = await verifyFaceWithPythonService(faceFile.path, workerId);
    const faceValid = faceResult.faceValid;
    const faceReason = faceResult.reason;

    const flagReasons = [];
    if (!timeValid) flagReasons.push(timeReason);
    if (!locationValid) flagReasons.push(locationReason);
    if (!faceValid) flagReasons.push(faceReason);

    const status = flagReasons.length > 0 ? 'FLAGGED' : 'PENDING';
    const beforeRel = fieldImageRelativePath(fieldFile);

    const record = await AttendanceRecord.create({
      worker: oid,
      task: task._id,
      checkInTime: now,
      checkInLocation: { latitude: lat, longitude: lon },
      checkInFaceMatch: faceValid,
      beforeImage: beforeRel,
      status,
      flagReasons,
    });

    if (status === 'FLAGGED') {
      const workerDoc = await User.findById(workerId).select('fullName').lean();
      const fullName = workerDoc?.fullName || 'Worker';
      await Notification.create({
        recipient: task.createdBy,
        message: `Check-in flagged for worker ${fullName} on task ${task.title}: ${flagReasons.join(', ')}`,
        type: 'FLAG',
        relatedId: record._id,
      });
    }

    const message =
      flagReasons.length > 0
        ? 'Checked in with flags — team lead notified'
        : 'Checked in successfully';

    return sendSuccess(
      res,
      {
        attendanceId: record._id,
        status,
        flagReasons,
        checkInTime: record.checkInTime,
        message,
      },
      message
    );
  } catch (err) {
    next(err);
  }
}

async function checkOut(req, res, next) {
  try {
    const workerId = req.user.userId;
    const oid = new mongoose.Types.ObjectId(workerId);
    const faceFile = req.files?.faceImage?.[0];
    const fieldFile = req.files?.fieldImage?.[0];
    if (!faceFile || !fieldFile) {
      return sendError(res, 'faceImage and fieldImage are required', 400);
    }

    const { attendanceId, latitude, longitude } = req.body;
    if (!attendanceId || latitude === undefined || longitude === undefined) {
      return sendError(res, 'attendanceId, latitude, and longitude are required', 400);
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return sendError(res, 'Invalid latitude or longitude', 400);
    }

    const record = await AttendanceRecord.findOne({
      _id: attendanceId,
      worker: oid,
      isDeleted: false,
    });

    if (!record) {
      return sendError(res, 'Attendance record not found', 404);
    }
    if (record.checkOutTime) {
      return sendError(res, 'Already checked out', 400);
    }
    if (!record.checkInTime) {
      return sendError(res, 'Cannot check out without checking in first', 400);
    }

    const task = await Task.findById(record.task);
    if (!task) {
      return sendError(res, 'Associated task not found', 404);
    }

    const now = new Date();
    const bufferOut = task.checkOutBuffer ?? 15;
    const timeCheck = checkWindowAgainstTimeStr(
      task.endTime,
      bufferOut,
      now,
      'Check-out outside allowed time window'
    );
    const timeValid = timeCheck.timeValid;
    const timeReason = timeCheck.reason;

    const distance = getDistanceInMeters(lat, lon, task.latitude, task.longitude);
    let locationValid = true;
    let locationReason = '';
    if (distance > task.allowedRadius) {
      locationValid = false;
      locationReason = `Location too far from task site (${Math.round(distance)}m away, limit: ${task.allowedRadius}m)`;
    }

    const faceResult = await verifyFaceWithPythonService(faceFile.path, workerId);
    const faceValid = faceResult.faceValid;
    const faceReason = faceResult.reason;

    const newFlagReasons = [];
    if (!timeValid) newFlagReasons.push(timeReason);
    if (!locationValid) newFlagReasons.push(locationReason);
    if (!faceValid) newFlagReasons.push(faceReason);

    const existingFlags = Array.isArray(record.flagReasons) ? [...record.flagReasons] : [];
    const allFlags = [...existingFlags, ...newFlagReasons];
    const finalStatus = allFlags.length === 0 ? 'VERIFIED' : 'FLAGGED';

    record.checkOutTime = now;
    record.checkOutLocation = { latitude: lat, longitude: lon };
    record.checkOutFaceMatch = faceValid;
    record.afterImage = fieldImageRelativePath(fieldFile);
    record.status = finalStatus;
    record.flagReasons = allFlags;
    await record.save();

    if (finalStatus === 'FLAGGED') {
      const workerDoc = await User.findById(workerId).select('fullName').lean();
      const fullName = workerDoc?.fullName || 'Worker';
      await Notification.create({
        recipient: task.createdBy,
        message: `Check-out flagged for worker ${fullName} on task ${task.title}: ${allFlags.join(', ')}`,
        type: 'FLAG',
        relatedId: record._id,
      });
    }

    const message =
      finalStatus === 'VERIFIED'
        ? 'Attendance verified successfully!'
        : 'Checked out with flags — team lead notified';

    return sendSuccess(
      res,
      {
        attendanceId: record._id,
        finalStatus,
        flagReasons: allFlags,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        message,
      },
      message
    );
  } catch (err) {
    next(err);
  }
}

async function getAttendanceHistory(req, res, next) {
  try {
    const workerId = req.user.userId;
    const oid = new mongoose.Types.ObjectId(workerId);
    const now = new Date();

    let month = parseInt(req.query.month, 10);
    let year = parseInt(req.query.year, 10);
    if (Number.isNaN(month) || month < 1 || month > 12) {
      month = now.getMonth() + 1;
    }
    if (Number.isNaN(year)) {
      year = now.getFullYear();
    }

    const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const baseWorkerFilter = { worker: oid, isDeleted: false };

    const [monthRecords, total, verified, flagged, pending] = await Promise.all([
      AttendanceRecord.find({
        worker: oid,
        isDeleted: false,
        checkInTime: { $gte: monthStart, $lte: monthEnd },
      })
        .populate('task', 'title locationName workType date startTime endTime')
        .sort({ checkInTime: 1 })
        .lean(),
      AttendanceRecord.countDocuments(baseWorkerFilter),
      AttendanceRecord.countDocuments({ ...baseWorkerFilter, status: 'VERIFIED' }),
      AttendanceRecord.countDocuments({ ...baseWorkerFilter, status: 'FLAGGED' }),
      AttendanceRecord.countDocuments({ ...baseWorkerFilter, status: 'PENDING' }),
    ]);

    const attendanceRate = total > 0 ? Math.round((verified / total) * 100) : 0;

    return sendSuccess(
      res,
      {
        records: monthRecords,
        stats: {
          total,
          verified,
          flagged,
          pending,
          attendanceRate,
        },
        month,
        year,
      },
      'Attendance history'
    );
  } catch (err) {
    next(err);
  }
}

async function getAttendanceDetail(req, res, next) {
  try {
    const workerId = req.user.userId;
    const oid = new mongoose.Types.ObjectId(workerId);
    const { id: attendanceId } = req.params;

    if (!mongoose.isValidObjectId(attendanceId)) {
      return sendError(res, 'Record not found', 404);
    }

    const record = await AttendanceRecord.findOne({
      _id: attendanceId,
      worker: oid,
      isDeleted: false,
    })
      .populate('task')
      .populate('worker', 'fullName username')
      .lean();

    if (!record) {
      return sendError(res, 'Record not found', 404);
    }

    return sendSuccess(res, { record }, 'Attendance detail');
  } catch (err) {
    next(err);
  }
}

async function getLeaveData(req, res, next) {
  try {
    const workerId = req.user.userId;
    const oid = new mongoose.Types.ObjectId(workerId);

    const allLeaves = await LeaveRequest.find({ worker: oid })
      .sort({ createdAt: -1 })
      .populate('reviewedBy', 'fullName')
      .lean();

    const usedLeaves = sumApprovedLeaveDays(allLeaves);
    const pendingLeaves = allLeaves.filter((l) => l.status === 'PENDING').length;
    const remaining = TOTAL_LEAVES_PER_YEAR - usedLeaves;

    return sendSuccess(
      res,
      {
        leaves: allLeaves,
        balance: {
          total: TOTAL_LEAVES_PER_YEAR,
          used: usedLeaves,
          remaining,
          pending: pendingLeaves,
        },
      },
      'Leave data'
    );
  } catch (err) {
    next(err);
  }
}

async function submitLeave(req, res, next) {
  try {
    const workerId = req.user.userId;
    const oid = new mongoose.Types.ObjectId(workerId);
    const { fromDate, toDate, reason, leaveType } = req.body;

    if (!fromDate || !toDate || reason == null || reason === '' || !leaveType) {
      return sendError(res, 'fromDate, toDate, reason, and leaveType are required', 400);
    }

    const reasonStr = String(reason).trim();
    if (reasonStr.length < 10) {
      return sendError(res, 'Reason must be at least 10 characters', 400);
    }

    if (!WORKER_LEAVE_TYPES.includes(leaveType)) {
      return sendError(res, 'Invalid leave type', 400);
    }

    const fromD = parseBodyDate(fromDate);
    const toD = parseBodyDate(toDate);
    if (!fromD || !toD || Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
      return sendError(res, 'Invalid date values', 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fromStart = new Date(fromD);
    fromStart.setHours(0, 0, 0, 0);
    if (fromStart < today) {
      return sendError(res, 'Leave start date cannot be in the past', 400);
    }

    const toStart = new Date(toD);
    toStart.setHours(0, 0, 0, 0);
    if (toStart < fromStart) {
      return sendError(res, 'End date must be after start date', 400);
    }

    const overlap = await LeaveRequest.findOne({
      worker: oid,
      status: { $ne: 'REJECTED' },
      fromDate: { $lte: toD },
      toDate: { $gte: fromD },
    }).lean();

    if (overlap) {
      return sendError(res, 'You already have a leave request for these dates', 400);
    }

    const daysRequested = leaveSpanDays(fromD, toD);

    const approvedLeaves = await LeaveRequest.find({ worker: oid, status: 'APPROVED' }).lean();
    const usedLeaves = sumApprovedLeaveDays(approvedLeaves);
    const remainingEntitlement = Math.max(0, TOTAL_LEAVES_PER_YEAR - usedLeaves);
    const paidDaysInRequest = Math.min(daysRequested, remainingEntitlement);
    const excessUnpaidDays = Math.max(0, daysRequested - remainingEntitlement);
    const exceedsEntitlement = excessUnpaidDays > 0;

    const leaveRequest = await LeaveRequest.create({
      worker: oid,
      fromDate: fromD,
      toDate: toD,
      reason: reasonStr,
      leaveType,
      status: 'PENDING',
      exceedsEntitlement,
      paidDaysInRequest,
      excessUnpaidDays,
    });

    const workerName = req.user.name || 'A worker';
    const fromLabel = fromStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const toLabel = toStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const dayWord = (n) => `${n} day${n === 1 ? '' : 's'}`;
    const balanceLine = exceedsEntitlement
      ? `${dayWord(daysRequested)} total. ${dayWord(paidDaysInRequest)} within paid annual leave; ${dayWord(
          excessUnpaidDays
        )} exceed balance (unpaid/extra — pending your approval).`
      : `${dayWord(daysRequested)} total — all within paid annual leave.`;

    const teamLeadMessage = `${workerName} requested ${leaveType} leave (${fromLabel} – ${toLabel}). ${balanceLine}`;

    const teamLeads = await User.find({ role: ROLES.TEAM_LEAD, isDeleted: false }).select('_id').lean();
    if (teamLeads.length > 0) {
      await Notification.insertMany(
        teamLeads.map((tl) => ({
          recipient: tl._id,
          message: teamLeadMessage,
          type: 'LEAVE',
          relatedId: leaveRequest._id,
        }))
      );
    }

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('reviewedBy', 'fullName')
      .lean();

    return sendSuccess(res, { leave: populated }, 'Leave request submitted successfully');
  } catch (err) {
    next(err);
  }
}

async function cancelLeave(req, res, next) {
  try {
    const workerId = req.user.userId;
    const oid = new mongoose.Types.ObjectId(workerId);
    const { id: leaveId } = req.params;

    if (!mongoose.isValidObjectId(leaveId)) {
      return sendError(res, 'Leave request not found', 404);
    }

    const leave = await LeaveRequest.findOne({ _id: leaveId, worker: oid });
    if (!leave) {
      return sendError(res, 'Leave request not found', 404);
    }
    if (leave.status !== 'PENDING') {
      return sendError(res, 'Only pending leave requests can be cancelled', 400);
    }

    await LeaveRequest.deleteOne({ _id: leave._id });
    return sendSuccess(res, {}, 'Leave request cancelled');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardData,
  getTodayAttendance,
  checkIn,
  checkOut,
  getAttendanceHistory,
  getAttendanceDetail,
  getLeaveData,
  submitLeave,
  cancelLeave,
};
