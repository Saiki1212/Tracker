const { validationResult } = require('express-validator');

module.exports = function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  res.status(400).json({
    error: 'Validation failed',
    details: result.array().map((e) => ({ field: e.path, msg: e.msg })),
  });
};
