const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { ROLES } = require('../utils/constants');
const { sendSuccess } = require('../utils/response');

router.get(
  '/workers',
  verifyToken,
  authorizeRoles(ROLES.TEAM_LEAD, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const workers = await User.find({ role: ROLES.FIELD_WORKER, isDeleted: false })
        .select('_id fullName')
        .lean();
      const list = workers.map((w) => ({ id: w._id.toString(), name: w.fullName }));
      return sendSuccess(res, list);
    } catch (e) {
      return next(e);
    }
  }
);

module.exports = router;
