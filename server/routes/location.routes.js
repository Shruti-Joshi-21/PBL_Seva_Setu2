const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
<<<<<<< HEAD
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/search', verifyToken, authorizeRoles('TEAM_LEAD', 'ADMIN'), locationController.searchLocation);
router.post('/save', verifyToken, authorizeRoles('TEAM_LEAD', 'ADMIN'), locationController.saveLocation);
=======
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { ROLES } = require('../utils/constants');

router.get('/search', verifyToken, authorizeRoles(ROLES.TEAM_LEAD, ROLES.ADMIN), locationController.searchLocation);
router.post('/save', verifyToken, authorizeRoles(ROLES.TEAM_LEAD, ROLES.ADMIN), locationController.saveLocation);
>>>>>>> 50d3b5e (Frontend & backend setup)
router.get('/', verifyToken, locationController.getLocations);

module.exports = router;
