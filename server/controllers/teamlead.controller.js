const teamleadService = require('../services/teamlead.service');
const { sendSuccess, sendError } = require('../utils/response');

async function getDashboardSummary(req, res, next) {
  try {
    const teamLeadId = req.userId;
    if (!teamLeadId) {
      return sendError(res, 'Unauthorized', 401);
    }
    const data = await teamleadService.getDashboardSummary(teamLeadId);
    return sendSuccess(res, data, 'Dashboard summary loaded');
  } catch (err) {
    return next(err);
  }
}

module.exports = { getDashboardSummary };
