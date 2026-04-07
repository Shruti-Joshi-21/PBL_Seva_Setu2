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

module.exports = {
  getDashboardData,
  getTodayAttendance,
  checkIn,
  checkOut,
  getAttendanceHistory,
  getAttendanceDetail,
};
