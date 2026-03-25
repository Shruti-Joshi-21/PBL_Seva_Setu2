const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const { verifyToken, isTeamLead } = require('../middlewares/auth.middleware');

router.get('/search', verifyToken, isTeamLead, locationController.searchLocation);
router.post('/save', verifyToken, isTeamLead, locationController.saveLocation);
router.get('/', verifyToken, locationController.getLocations);

module.exports = router;
