/**
 * Cron endpoints. These DO NOT require a JWT — they're authenticated via a
 * shared CRON_SECRET passed as a Bearer token by Vercel Cron.
 *
 *   Vercel Cron config (in vercel.json):
 *     { "path": "/api/cron/send-reminders", "schedule": "0 * * * *" }
 *
 * Vercel automatically sets `Authorization: Bearer ${CRON_SECRET}` on the
 * outbound request when an env var named CRON_SECRET exists in the project.
 */
const router = require('express').Router();
const Task = require('../models/Task');
const asyncHandler = require('../utils/asyncHandler');
const { sendReminder } = require('../utils/mailer');
const { computeNext, wasPreviousIgnored } = require('../utils/scheduler');

function checkCronSecret(req, res, next) {
  if (!process.env.CRON_SECRET) {
    return res.status(500).json({ error: 'CRON_SECRET not configured' });
  }
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * Find every task whose nextReminderAt has passed, send a reminder email,
 * advance its schedule, and record the result. Idempotent: safe to run more
 * than once per slot — we only pick tasks where nextReminderAt <= now.
 */
const sendRemindersHandler = asyncHandler(async (req, res) => {
  const now = new Date();
  const BATCH_LIMIT = 100;

  const due = await Task.find({
    reminderEnabled: true,
    nextReminderAt: { $lte: now, $ne: null },
    status: { $nin: ['Archived', 'Completed'] },
  })
    .populate('createdBy', 'email name')
    .limit(BATCH_LIMIT);

  let sent = 0;
  let failed = 0;
  const results = [];

  for (const task of due) {
    const isOverdue = wasPreviousIgnored(task);
    if (isOverdue) {
      task.missedCount = (task.missedCount || 0) + 1;
      task.streakCount = 0;
      task.status = 'Missed';
    }

    let delivered = true;
    let error;
    try {
      await sendReminder({
        task,
        user: task.createdBy,
        isOverdue,
      });
    } catch (e) {
      delivered = false;
      error = e.message;
      console.error('[cron] reminder failed', task._id?.toString(), e.message);
      failed++;
    }

    task.lastReminderSentAt = now;
    task.nextReminderAt = computeNext(task, now);
    task.reminderHistory = task.reminderHistory || [];
    task.reminderHistory.push({ sentAt: now, delivered, error });
    // keep only last 30 events
    if (task.reminderHistory.length > 30) {
      task.reminderHistory = task.reminderHistory.slice(-30);
    }

    try {
      await task.save();
    } catch (e) {
      console.error('[cron] task save failed', task._id?.toString(), e.message);
    }

    if (delivered) sent++;
    results.push({
      taskId: task._id,
      title: task.title,
      to: task.createdBy && task.createdBy.email,
      delivered,
      isOverdue,
      error,
    });
  }

  res.json({
    ok: true,
    ranAt: now.toISOString(),
    due: due.length,
    sent,
    failed,
    batchLimit: BATCH_LIMIT,
    truncated: due.length === BATCH_LIMIT,
    results,
  });
});

// Vercel Cron uses GET; we accept POST too for manual debugging via curl.
router.get('/send-reminders', checkCronSecret, sendRemindersHandler);
router.post('/send-reminders', checkCronSecret, sendRemindersHandler);

// Lightweight health probe for the cron infra (still secret-protected).
router.get(
  '/health',
  checkCronSecret,
  asyncHandler(async (req, res) => {
    const due = await Task.countDocuments({
      reminderEnabled: true,
      nextReminderAt: { $lte: new Date() },
      status: { $nin: ['Archived', 'Completed'] },
    });
    res.json({ ok: true, dueNow: due, ts: Date.now() });
  })
);

module.exports = router;
