module.exports = function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
  const body = { error: err.message || 'Server error' };
  if (err.details) body.details = err.details;
  if (status >= 500) console.error('[err]', err);
  res.status(status).json(body);
};
