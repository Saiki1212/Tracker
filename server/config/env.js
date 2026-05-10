require('dotenv').config();

const required = ['MONGO_URI', 'JWT_SECRET', 'AUTH_EMAIL', 'AUTH_PASSWORD_HASH'];
const missing = required.filter((k) => !process.env[k]);

if (missing.length && process.env.NODE_ENV !== 'test') {
  console.warn(`[env] Missing required vars: ${missing.join(', ')}`);
}

module.exports = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  AUTH_EMAIL: process.env.AUTH_EMAIL,
  AUTH_PASSWORD_HASH: process.env.AUTH_PASSWORD_HASH,
  AUTH_NAME: process.env.AUTH_NAME || 'Operator',
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || true,
  PORT: parseInt(process.env.PORT, 10) || 5174,
  NODE_ENV: process.env.NODE_ENV || 'development',
};
