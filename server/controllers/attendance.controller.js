const attendanceService = require('../services/attendance.service');
const AttendanceRecord = require('../models/AttendanceRecord');
const User = require('../models/User');

const checkIn = async (req, res) => {
    try {
        const { taskId, lat, lon } = req.body;
        const userId = req.userId;

        // 1. Validate Location
        const isLocationValid = await attendanceService.validateCheckIn(taskId, lat, lon);
        let status = 'VERIFIED';
        let flags = [];

        if (!isLocationValid) {
            status = 'FLAGGED';
            flags.push('OUT_OF_RADIUS_CHECKIN');
        }

        // 2. Face Match (if image provided)
        let faceMatched = true;
        let imagePath = null;
        if (req.file) {
            imagePath = req.file.path;
            const user = await User.findById(userId).select('faceEncoding role');
            if (user?.role === 'FIELD_WORKER' && user.faceEncoding) {
                const matchResult = await attendanceService.verifyFaceMatch(imagePath, user.faceEncoding.toString('base64'));
                faceMatched = !!matchResult.matched;
                if (!matchResult.matched) {
                    status = 'FLAGGED';
                    flags.push('FACE_MISMATCH_CHECKIN');
                }
            }
        }

        // 3. Create Record
        const attendanceId = await attendanceService.createCheckIn({
            userId, taskId, lat: Number(lat), lon: Number(lon), imagePath, status, faceMatched, flagReasons: flags
        });

        res.json({ success: true, message: 'Check-in recorded', data: { id: attendanceId, status, flags } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const checkOut = async (req, res) => {
    try {
        const { taskId, lat, lon } = req.body;
        const workerId = req.userId;

        const attendance = await AttendanceRecord.findOne({
            task: taskId,
            worker: workerId,
            checkOutTime: { $exists: false },
        }).sort({ checkInTime: -1, createdAt: -1 });

        if (!attendance) {
            return res.status(400).json({ success: false, message: 'Active check-in not found' });
        }
        const isLocationValid = await attendanceService.validateCheckIn(taskId, lat, lon);
        let status = 'VERIFIED';
        let flags = [];

        if (!isLocationValid) {
            status = 'FLAGGED';
            flags.push('OUT_OF_RADIUS_CHECKOUT');
        }

        let faceMatched = true;
        let imagePath = null;
        if (req.file) {
            imagePath = req.file.path;
            const user = await User.findById(workerId).select('faceEncoding role');
            if (user?.role === 'FIELD_WORKER' && user.faceEncoding) {
                const matchResult = await attendanceService.verifyFaceMatch(imagePath, user.faceEncoding.toString('base64'));
                faceMatched = !!matchResult.matched;
                if (!matchResult.matched) {
                    status = 'FLAGGED';
                    flags.push('FACE_MISMATCH_CHECKOUT');
                }
            }
        }

        await attendanceService.createCheckOut(attendance._id.toString(), {
            lat: Number(lat), lon: Number(lon), imagePath, status, faceMatched, flagReasons: flags
        });

        res.json({ success: true, message: 'Check-out successful', data: { status, flags } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
    const attendanceId = await attendanceService.createCheckIn({
      userId,
      taskId,
      lat,
      lon,
      imagePath,
      status,
      faceMatched,
      flagReasons: flags,
    });
    return sendSuccess(res, { id: attendanceId, status, flags }, 'Check-in recorded');
  } catch (error) {
    return next(error);
  }
};

const submitReport = async (req, res) => {
    try {
        const { taskId, description } = req.body;
        const workerId = req.userId;

        const attendance = await AttendanceRecord.findOne({ task: taskId, worker: workerId }).sort({ checkInTime: -1, createdAt: -1 });
        if (!attendance) {
            return res.status(400).json({ success: false, message: 'Attendance record not found' });
        }

        const imagesPaths = req.files ? req.files.map(f => f.path) : [];
        await attendanceService.submitReport({ workerId, taskId, attendanceId: attendance._id.toString(), description, imagesPaths });

        res.json({ success: true, message: 'Report submitted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
    await attendanceService.createCheckOut(attendance._id.toString(), {
      lat,
      lon,
      imagePath,
      status,
      faceMatched,
      flagReasons: flags,
    });
    return sendSuccess(res, { status, flags }, 'Check-out successful');
  } catch (error) {
    return next(error);
  }
};

const submitReport = async (req, res, next) => {
  try {
    const { taskId, description } = req.body;
    const workerId = req.userId;
    const attendance = await AttendanceRecord.findOne({ task: taskId, worker: workerId }).sort({
      checkInTime: -1,
      createdAt: -1,
    });
    if (!attendance) {
      return sendError(res, 'Attendance record not found', 400);
    }
    const imagesPaths = req.files ? req.files.map((f) => f.path) : [];
    await attendanceService.submitReport({
      workerId,
      taskId,
      attendanceId: attendance._id.toString(),
      description,
      imagesPaths,
    });
    return sendSuccess(res, {}, 'Report submitted successfully');
  } catch (error) {
    return next(error);
  }
};

const getAllAttendance = async (req, res, next) => {
  try {
    const data = await attendanceService.getAllAttendance();
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
};

const getCurrentAttendance = async (req, res) => {
    try {
        const { taskId } = req.params;
        const workerId = req.userId;
        const record = await AttendanceRecord.findOne({ task: taskId, worker: workerId }).sort({ checkInTime: -1, createdAt: -1 });
        res.json({ success: true, data: record || null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
  checkIn,
  checkOut,
  submitReport,
  getAllAttendance,
  reviewAttendance,
  getCurrentAttendance,
};
