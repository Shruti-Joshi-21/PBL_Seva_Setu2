const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const workerController = require('../controllers/workerController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { ROLES } = require('../utils/constants');

const attendanceDir = path.join(__dirname, '..', 'uploads', 'attendance');
if (!fs.existsSync(attendanceDir)) fs.mkdirSync(attendanceDir, { recursive: true });

const attendanceUpload = multer({
  dest: attendanceDir,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only jpeg/jpg/png images are allowed'));
  },
}).fields([
  { name: 'faceImage', maxCount: 1 },
  { name: 'fieldImage', maxCount: 1 },
]);

router.get('/dashboard', verifyToken, authorizeRoles(ROLES.FIELD_WORKER), workerController.getDashboardData);
router.get(
  '/attendance/today',
  verifyToken,
  authorizeRoles(ROLES.FIELD_WORKER),
  workerController.getTodayAttendance
);
router.get(
  '/attendance/history',
  verifyToken,
  authorizeRoles(ROLES.FIELD_WORKER),
  workerController.getAttendanceHistory
);
router.get(
  '/attendance/:id',
  verifyToken,
  authorizeRoles(ROLES.FIELD_WORKER),
  workerController.getAttendanceDetail
);
router.post('/checkin', verifyToken, authorizeRoles(ROLES.FIELD_WORKER), attendanceUpload, workerController.checkIn);
router.post('/checkout', verifyToken, authorizeRoles(ROLES.FIELD_WORKER), attendanceUpload, workerController.checkOut);

router.get('/leave', verifyToken, authorizeRoles(ROLES.FIELD_WORKER), workerController.getLeaveData);
router.post('/leave', verifyToken, authorizeRoles(ROLES.FIELD_WORKER), workerController.submitLeave);
router.delete('/leave/:id', verifyToken, authorizeRoles(ROLES.FIELD_WORKER), workerController.cancelLeave);

module.exports = router;
