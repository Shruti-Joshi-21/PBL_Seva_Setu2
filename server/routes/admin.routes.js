const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/users', verifyToken, authorizeRoles('ADMIN'), adminController.getAllUsers);
router.patch('/users/:id/status', verifyToken, authorizeRoles('ADMIN'), adminController.toggleUserStatus);
router.delete('/users/:id', verifyToken, authorizeRoles('ADMIN'), adminController.deleteUser);
router.get('/stats', verifyToken, authorizeRoles('ADMIN'), adminController.getStats);

module.exports = router;
