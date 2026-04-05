const mongoose = require('mongoose');
const Task = require('../models/Task');
const AttendanceRecord = require('../models/AttendanceRecord');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const { ROLES, ATTENDANCE_STATUS, LEAVE_STATUS } = require('../utils/constants');

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function toId(id) {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

/**
 * Tasks are owned by the team lead via Task.createdBy (schema field name).
 * Workers are linked via User.assignedTeamLead.
 */
async function getDashboardSummary(teamLeadIdRaw) {
  const teamLeadId = toId(teamLeadIdRaw);
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const taskMatch = { createdBy: teamLeadId, isDeleted: false };

  const taskStatusAgg = await Task.aggregate([
    { $match: taskMatch },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const taskStatusCounts = { ACTIVE: 0, COMPLETED: 0, CANCELLED: 0 };
  taskStatusAgg.forEach((row) => {
    if (row._id && taskStatusCounts[row._id] !== undefined) {
      taskStatusCounts[row._id] = row.count;
    }
  });

  const allTeamTasks = await Task.find(taskMatch).select('_id').lean();
  const teamTaskIds = allTeamTasks.map((t) => t._id);

  const attendanceTodayMatch = {
    task: { $in: teamTaskIds },
    isDeleted: false,
    checkInTime: { $gte: todayStart, $lte: todayEnd },
  };

  const attendanceStatusAgg = await AttendanceRecord.aggregate([
    { $match: attendanceTodayMatch },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const attendanceByStatus = {
    VERIFIED: 0,
    FLAGGED: 0,
    PENDING: 0,
    REJECTED: 0,
  };
  attendanceStatusAgg.forEach((row) => {
    if (row._id && attendanceByStatus[row._id] !== undefined) {
      attendanceByStatus[row._id] = row.count;
    }
  });

  const workers = await User.find({
    role: ROLES.FIELD_WORKER,
    assignedTeamLead: teamLeadId,
    isDeleted: false,
  })
    .select('_id fullName')
    .lean();

  const workerIds = workers.map((w) => w._id);

  const distinctPresentIds = await AttendanceRecord.distinct('worker', {
    ...attendanceTodayMatch,
    worker: { $in: workerIds },
  });

  const workersPresent = distinctPresentIds.length;
  const workersTotal = workers.length;

  const pendingLeavesCount = await LeaveRequest.countDocuments({
    status: LEAVE_STATUS.PENDING,
    worker: { $in: workerIds },
  });

  const todayTaskDocs = await Task.find({
    ...taskMatch,
    date: { $gte: todayStart, $lte: todayEnd },
  })
    .populate('assignedWorkers', 'fullName')
    .sort({ startTime: 1 })
    .lean();

  const todaysTasks = await Promise.all(
    todayTaskDocs.map(async (t) => {
      const totalWorkers = Array.isArray(t.assignedWorkers) ? t.assignedWorkers.length : 0;
      const checkedInCount = await AttendanceRecord.countDocuments({
        task: t._id,
        isDeleted: false,
        checkInTime: { $gte: todayStart, $lte: todayEnd },
      });
      return {
        id: t._id.toString(),
        title: t.title,
        locationName: t.locationName,
        startTime: t.startTime,
        endTime: t.endTime,
        workType: t.workType,
        status: t.status,
        allowedRadius: t.allowedRadius,
        totalWorkers,
        checkedInCount,
      };
    })
  );

  const workerAttendance = await Promise.all(
    workers.map(async (w) => {
      const rec = await AttendanceRecord.findOne({
        worker: w._id,
        task: { $in: teamTaskIds },
        isDeleted: false,
        checkInTime: { $gte: todayStart, $lte: todayEnd },
      })
        .sort({ checkInTime: -1 })
        .populate('task', 'workType title')
        .lean();

      let presence = 'absent';
      if (rec) {
        if (rec.checkOutTime) presence = 'out';
        else presence = 'in';
      }

      return {
        workerId: w._id.toString(),
        fullName: w.fullName,
        taskWorkType: rec?.task?.workType || null,
        taskTitle: rec?.task?.title || null,
        presence,
      };
    })
  );

  const flaggedRecords = await AttendanceRecord.find({
    task: { $in: teamTaskIds },
    status: ATTENDANCE_STATUS.FLAGGED,
    isDeleted: false,
  })
    .sort({ updatedAt: -1 })
    .limit(3)
    .populate('task', 'title')
    .populate('worker', 'fullName')
    .lean();

  const flaggedFormatted = flaggedRecords.map((r) => ({
    id: r._id.toString(),
    title: r.task?.title || 'Attendance',
    description: (r.flagReasons && r.flagReasons.length ? r.flagReasons.join(', ') : 'Flagged for review') || '',
    workerName: r.worker?.fullName || '',
    time: r.checkInTime || r.updatedAt,
  }));

  const leaveRequests = await LeaveRequest.find({
    status: LEAVE_STATUS.PENDING,
    worker: { $in: workerIds },
  })
    .sort({ createdAt: -1 })
    .limit(2)
    .populate('worker', 'fullName')
    .lean();

  const leaveFormatted = leaveRequests.map((lr) => ({
    id: lr._id.toString(),
    workerName: lr.worker?.fullName || '',
    fromDate: lr.fromDate,
    toDate: lr.toDate,
    leaveType: lr.leaveType,
    reason: lr.reason,
  }));

  return {
    stats: {
      activeTasks: taskStatusCounts.ACTIVE,
      workersPresent,
      workersTotal,
      flaggedToday: attendanceByStatus.FLAGGED,
      pendingLeaves: pendingLeavesCount,
      taskStatusCounts,
      attendanceToday: attendanceByStatus,
    },
    todaysTasks,
    workerAttendance,
    flaggedRecords: flaggedFormatted,
    leaveRequests: leaveFormatted,
  };
}

module.exports = { getDashboardSummary };
