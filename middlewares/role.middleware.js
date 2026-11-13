const ApiError = require('../utils/ApiError');

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access forbidden: required role ${allowedRoles.join(' or ')}, but you have ${req.user.role}`
        )
      );
    }

    next();
  };
};

module.exports = authorize;
