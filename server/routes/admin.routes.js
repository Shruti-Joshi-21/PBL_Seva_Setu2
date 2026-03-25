const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

router.get('/users', verifyToken, isAdmin, adminController.getAllUsers);
router.patch('/users/:id/status', verifyToken, isAdmin, adminController.toggleUserStatus);
router.delete('/users/:id', verifyToken, isAdmin, adminController.deleteUser);
router.get('/stats', verifyToken, isAdmin, adminController.getStats);

module.exports = router;
