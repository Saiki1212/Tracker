const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const errorHandler = require('./middleware/error');
const auth = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/projectTasks');
const applicationRoutes = require('./routes/applications');
const interviewRoutes = require('./routes/interviews');
const resumeRoutes = require('./routes/resumes');
const learningRoutes = require('./routes/learning');
const noteRoutes = require('./routes/notes');
const weeklyRoutes = require('./routes/weekly');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');

const app = express();
app.disable('x-powered-by');

app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
if (env.NODE_ENV !== 'test') app.use(morgan('tiny'));

// Health
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Public
app.use('/api/auth', authRoutes);

// Protected
app.use('/api/companies', auth, companyRoutes);
app.use('/api/projects', auth, projectRoutes);
app.use('/api/projects', auth, taskRoutes); // /:id/tasks lives here
app.use('/api/applications', auth, applicationRoutes);
app.use('/api/interviews', auth, interviewRoutes);
app.use('/api/resumes', auth, resumeRoutes);
app.use('/api/learning', auth, learningRoutes);
app.use('/api/notes', auth, noteRoutes);
app.use('/api/weekly', auth, weeklyRoutes);
app.use('/api/analytics', auth, analyticsRoutes);
app.use('/api/settings', auth, settingsRoutes);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  next();
});

app.use(errorHandler);

module.exports = app;
