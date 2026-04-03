const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
<<<<<<< HEAD
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/create', verifyToken, authorizeRoles('TEAM_LEAD', 'ADMIN'), taskController.create);
router.get('/worker', verifyToken, taskController.getWorkerTasks);
router.get('/all', verifyToken, authorizeRoles('TEAM_LEAD', 'ADMIN'), taskController.getAll);
=======
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { ROLES } = require('../utils/constants');

router.post('/create', verifyToken, authorizeRoles(ROLES.TEAM_LEAD, ROLES.ADMIN), taskController.create);
router.get('/worker', verifyToken, taskController.getWorkerTasks);
router.get('/all', verifyToken, authorizeRoles(ROLES.TEAM_LEAD, ROLES.ADMIN), taskController.getAll);
>>>>>>> 50d3b5e (Frontend & backend setup)

module.exports = router;
