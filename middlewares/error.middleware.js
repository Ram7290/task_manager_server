const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'An unexpected error occurred';
  let errors = [];

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.errors ? err.errors.map(e => ({ field: e.path, message: e.message })) : [];
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
  } else if (err.status) {
    statusCode = err.status;
    message = err.message || message;
  } else if (err.message) {
    message = err.message;
  }

  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    console.error('Unhandled Server Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: errors.length > 0 ? errors : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;
