const app = require('../server/app');
const connectDB = require('../server/config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (e) {
    console.error('[db] connection failed', e);
    return res.status(500).json({ error: 'Database connection failed' });
  }
  return app(req, res);
};
