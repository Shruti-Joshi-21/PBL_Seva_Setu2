const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/search', verifyToken, authorizeRoles('TEAM_LEAD', 'ADMIN'), locationController.searchLocation);
router.post('/save', verifyToken, authorizeRoles('TEAM_LEAD', 'ADMIN'), locationController.saveLocation);
router.get('/', verifyToken, locationController.getLocations);

module.exports = router;
