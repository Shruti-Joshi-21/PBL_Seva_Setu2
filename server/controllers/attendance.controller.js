const db = require('../config/db');
const attendanceService = require('../services/attendance.service');

const checkIn = async (req, res) => {
    try {
        const { taskId, lat, lon } = req.body;
        const userId = req.user.id;

        // 1. Validate Location
        const isLocationValid = await attendanceService.validateCheckIn(taskId, lat, lon);
        let status = 'VERIFIED';
        let flags = [];

        if (!isLocationValid) {
            status = 'FLAGGED';
            flags.push('OUT_OF_RADIUS_CHECKIN');
        }

        // 2. Face Match (if image provided)
        let matchScore = 1.0;
        let imagePath = null;
        if (req.file) {
            imagePath = req.file.path;
            const [[faceData]] = await db.execute('SELECT encoding FROM face_data WHERE user_id = ?', [userId]);
            if (faceData) {
                const matchResult = await attendanceService.verifyFaceMatch(imagePath, faceData.encoding.toString('base64'));
                matchScore = matchResult.score;
                if (!matchResult.matched) {
                    status = 'FLAGGED';
                    flags.push('FACE_MISMATCH_CHECKIN');
                }
            }
        }

        // 3. Create Record
        const attendanceId = await attendanceService.createCheckIn({
            userId, taskId, lat, lon, imagePath, status, matchScore
        });

        // 4. Create Flags
        for (const flag of flags) {
            await attendanceService.createFlag(attendanceId, flag, 'MEDIUM');
        }

        res.json({ success: true, message: 'Check-in recorded', data: { id: attendanceId, status, flags } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const checkOut = async (req, res) => {
    try {
        const { taskId, lat, lon } = req.body;
        const workerId = req.user.id;

        const [records] = await db.execute(
            'SELECT * FROM attendance_records WHERE task_id = ? AND user_id = ? AND check_out_time IS NULL ORDER BY check_in_time DESC LIMIT 1',
            [taskId, workerId]
        );

        if (records.length === 0) {
            return res.status(400).json({ success: false, message: 'Active check-in not found' });
        }

        const attendance = records[0];
        const isLocationValid = await attendanceService.validateCheckIn(taskId, lat, lon);
        let status = 'VERIFIED';
        let flags = [];

        if (!isLocationValid) {
            status = 'FLAGGED';
            flags.push('OUT_OF_RADIUS_CHECKOUT');
        }

        let matchScore = 1.0;
        let imagePath = null;
        if (req.file) {
            imagePath = req.file.path;
            const [[faceData]] = await db.execute('SELECT encoding FROM face_data WHERE user_id = ?', [workerId]);
            if (faceData) {
                const matchResult = await attendanceService.verifyFaceMatch(imagePath, faceData.encoding.toString('base64'));
                matchScore = matchResult.score;
                if (!matchResult.matched) {
                    status = 'FLAGGED';
                    flags.push('FACE_MISMATCH_CHECKOUT');
                }
            }
        }

        await attendanceService.createCheckOut(attendance.id, {
            lat, lon, imagePath, status, matchScore
        });

        for (const flag of flags) {
            await attendanceService.createFlag(attendance.id, flag, 'MEDIUM');
        }

        res.json({ success: true, message: 'Check-out successful', data: { status, flags } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const submitReport = async (req, res) => {
    try {
        const { taskId, description } = req.body;
        const workerId = req.user.id;

        const [records] = await db.execute(
            'SELECT id FROM attendance_records WHERE task_id = ? AND user_id = ? ORDER BY check_in_time DESC LIMIT 1',
            [taskId, workerId]
        );

        if (records.length === 0) {
            return res.status(400).json({ success: false, message: 'Attendance record not found' });
        }

        const imagesPaths = req.files ? req.files.map(f => f.path) : [];
        await attendanceService.submitReport({ attendanceId: records[0].id, description, imagesPaths });

        res.json({ success: true, message: 'Report submitted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAllAttendance = async (req, res) => {
    try {
        const data = await attendanceService.getAllAttendance();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const reviewAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await attendanceService.reviewAttendance(id, status);
        res.json({ success: true, message: 'Attendance reviewed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getCurrentAttendance = async (req, res) => {
    try {
        const { taskId } = req.params;
        const workerId = req.user.id;
        const [records] = await db.execute(
            'SELECT * FROM attendance_records WHERE task_id = ? AND user_id = ? ORDER BY check_in_time DESC LIMIT 1',
            [taskId, workerId]
        );
        res.json({ success: true, data: records.length > 0 ? records[0] : null });
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
    getCurrentAttendance
};
