const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { verifyToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload.middleware');

router.get('/current/:taskId', verifyToken, attendanceController.getCurrentAttendance);
router.get('/all', verifyToken, attendanceController.getAllAttendance);
router.post('/check-in', verifyToken, upload.single('face'), attendanceController.checkIn);
router.post('/check-out', verifyToken, upload.single('face'), attendanceController.checkOut);
router.post('/report', verifyToken, upload.array('images', 5), attendanceController.submitReport);
router.patch('/:id/review', verifyToken, attendanceController.reviewAttendance);

module.exports = router;
