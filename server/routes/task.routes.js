const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { verifyToken, isTeamLead } = require('../middlewares/auth.middleware');

router.post('/create', verifyToken, isTeamLead, taskController.create);
router.get('/worker', verifyToken, taskController.getWorkerTasks);
router.get('/all', verifyToken, isTeamLead, taskController.getAll);

module.exports = router;
