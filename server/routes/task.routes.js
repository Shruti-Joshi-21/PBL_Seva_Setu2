const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/create', verifyToken, authorizeRoles('TEAM_LEAD', 'ADMIN'), taskController.create);
router.get('/worker', verifyToken, taskController.getWorkerTasks);
router.get('/all', verifyToken, authorizeRoles('TEAM_LEAD', 'ADMIN'), taskController.getAll);

module.exports = router;
