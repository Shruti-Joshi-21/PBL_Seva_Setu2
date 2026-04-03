const express = require('express');
const router = express.Router();
const newAuthController = require('../controllers/authController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middlewares/authMiddleware');

// New MongoDB auth endpoints (required)
const facesDir = path.join(__dirname, '..', 'uploads', 'faces');
if (!fs.existsSync(facesDir)) fs.mkdirSync(facesDir, { recursive: true });
const upload = multer({
  dest: facesDir,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Only jpeg/jpg/png files are allowed'));
  },
});

router.post('/signup/field-worker', upload.single('faceImage'), newAuthController.signupFieldWorker);
router.post('/signup/team-lead', newAuthController.signupTeamLead);
router.post('/signup/admin', newAuthController.signupAdmin);
router.post('/login', newAuthController.login);
router.get('/me', verifyToken, newAuthController.getMe);

module.exports = router;
