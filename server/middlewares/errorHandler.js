const { sendError } = require('../utils/response');

function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    return sendError(res, err.message, 400);
  }
  if (err.code === 11000) {
    return sendError(res, 'Username already exists', 400);
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendError(res, 'Invalid token', 401);
  }
  console.error(err);
  return sendError(res, 'Internal server error', 500);
}

module.exports = errorHandler;
