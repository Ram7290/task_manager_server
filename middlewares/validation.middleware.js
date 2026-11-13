const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) {
      req.body = schema.body.parse(req.body);
    }
    if (schema.query) {
      req.query = schema.query.parse(req.query);
    }
    if (schema.params) {
      req.params = schema.params.parse(req.params);
    }
    next();
  } catch (error) {
    if (error.errors) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return next(ApiError.badRequest('Validation failed', formattedErrors));
    }
    next(error);
  }
};

module.exports = validate;
