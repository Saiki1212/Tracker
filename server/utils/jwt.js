const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

function sign(payload, opts = {}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d', ...opts });
}

function verify(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { sign, verify };
