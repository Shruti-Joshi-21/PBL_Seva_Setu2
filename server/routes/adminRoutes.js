const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { ROLES } = require('../utils/constants');

router.get('/users', verifyToken, authorizeRoles(ROLES.ADMIN), adminController.getAllUsers);
router.patch('/users/:id/status', verifyToken, authorizeRoles(ROLES.ADMIN), adminController.toggleUserStatus);
router.delete('/users/:id', verifyToken, authorizeRoles(ROLES.ADMIN), adminController.deleteUser);
router.get('/stats', verifyToken, authorizeRoles(ROLES.ADMIN), adminController.getStats);

module.exports = router;
