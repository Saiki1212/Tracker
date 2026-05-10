/**
 * Local launcher that mirrors the Vercel deploy:
 * - serves /api/* via the Express app
 * - serves the static public/ folder
 * Single port, single origin → no CORS in dev.
 */
const path = require('path');
const express = require('express');
const env = require('./server/config/env');
const connectDB = require('./server/config/db');
const app = require('./server/app');

const root = express();

// Defer DB connect until first /api hit, but warm it up now.
connectDB().catch((e) => console.error('[dev] DB connect failed:', e.message));

// API
root.use(app);

// Static frontend
const pub = path.join(__dirname, 'public');
root.use(express.static(pub, { extensions: ['html'] }));

// SPA fallback for unknown non-API paths → app.html
root.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(pub, 'app.html'));
});

const port = env.PORT;
root.listen(port, () => {
  console.log(`\nForge dev server: http://localhost:${port}\n`);
});
