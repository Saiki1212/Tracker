const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const asyncHandler = require('../utils/asyncHandler');
const { computeNext, computeFirstNext } = require('../utils/scheduler');

/* ========== validators ========== */
const isOneOf = (arr) => (v) => v === undefined || arr.includes(v);

const createValidators = [
  body('title').isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().isString().isLength({ max: 2000 }),
  body('category').custom(isOneOf(Task.CATEGORIES)),
  body('priority').custom(isOneOf(Task.PRIORITIES)),
  body('status').custom(isOneOf(Task.STATUSES)),
  body('frequencyType').custom(isOneOf(Task.FREQUENCIES)),
  body('reminderTime').optional().matches(/^([01]?\d|2[0-3]):[0-5]\d$/),
  body('reminderEnabled').optional().isBoolean(),
];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    error: 'Validation failed',
    details: errors.array().map((e) => ({ field: e.path, msg: e.msg })),
  });
}

/* ========== list / filtered fetches ========== */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = { createdBy: req.user.id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    const items = await Task.find(filter)
      .sort({ status: 1, nextReminderAt: 1, createdAt: -1 })
      .lean();
    res.json({ items });
  })
);

router.get(
  '/overdue',
  asyncHandler(async (req, res) => {
    const items = await Task.find({
      createdBy: req.user.id,
      reminderEnabled: true,
      nextReminderAt: { $lte: new Date() },
      status: { $nin: ['Archived', 'Completed'] },
    })
      .sort({ nextReminderAt: 1 })
      .lean();
    res.json({ items });
  })
);

router.get(
  '/upcoming',
  asyncHandler(async (req, res) => {
    const days = Math.min(60, parseInt(req.query.days, 10) || 7);
    const horizon = new Date(Date.now() + days * 86400000);
    const items = await Task.find({
      createdBy: req.user.id,
      reminderEnabled: true,
      nextReminderAt: { $gte: new Date(), $lte: horizon },
      status: { $nin: ['Archived', 'Completed'] },
    })
      .sort({ nextReminderAt: 1 })
      .lean();
    res.json({ items });
  })
);

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const items = await Task.find({
      createdBy: req.user.id,
      lastCompletionAt: { $ne: null },
    })
      .sort({ lastCompletionAt: -1 })
      .limit(limit)
      .lean();
    res.json({ items });
  })
);

router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const tasks = await Task.find({ createdBy: req.user.id }).lean();

    let completions = 0;
    let missed = 0;
    const byCategory = {};

    tasks.forEach((t) => {
      const c = t.totalCompletions || 0;
      const m = t.missedCount || 0;
      completions += c;
      missed += m;
      if (!byCategory[t.category]) byCategory[t.category] = { completions: 0, missed: 0, tasks: 0 };
      byCategory[t.category].completions += c;
      byCategory[t.category].missed += m;
      byCategory[t.category].tasks += 1;
    });

    const total = completions + missed;
    const completionPct = total ? +((completions / total) * 100).toFixed(1) : 0;
    const missedPct = total ? +((missed / total) * 100).toFixed(1) : 0;

    const strongest = [...tasks]
      .sort((a, b) => (b.streakCount || 0) - (a.streakCount || 0))
      .slice(0, 5)
      .map((t) => ({
        _id: t._id, title: t.title, category: t.category,
        streakCount: t.streakCount || 0, longestStreak: t.longestStreak || 0,
      }));

    const weakest = [...tasks]
      .filter((t) => (t.missedCount || 0) > 0)
      .sort((a, b) => (b.missedCount || 0) - (a.missedCount || 0))
      .slice(0, 5)
      .map((t) => ({
        _id: t._id, title: t.title, category: t.category,
        missedCount: t.missedCount || 0,
      }));

    res.json({
      totals: { completions, missed, total, completionPct, missedPct, taskCount: tasks.length },
      byCategory,
      strongest,
      weakest,
    });
  })
);

/* ========== single task CRUD ========== */

router.post(
  '/',
  createValidators,
  handleValidation,
  asyncHandler(async (req, res) => {
    const data = { ...req.body, createdBy: req.user.id };
    const task = new Task(data);
    if (task.reminderEnabled) {
      task.nextReminderAt = computeFirstNext(task);
    }
    await task.save();
    res.status(201).json({ item: task });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const item = await Task.findOne({ _id: req.params.id, createdBy: req.user.id }).lean();
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ item });
  })
);

router.patch(
  '/:id',
  createValidators,
  handleValidation,
  asyncHandler(async (req, res) => {
    const task = await Task.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!task) return res.status(404).json({ error: 'Not found' });

    const reminderFields = ['reminderEnabled', 'frequencyType', 'customFrequency', 'reminderTime'];
    const reminderChanged = reminderFields.some((k) => k in req.body);

    Object.assign(task, req.body);

    if (reminderChanged) {
      task.nextReminderAt = task.reminderEnabled ? computeFirstNext(task) : null;
    }

    await task.save();
    res.json({ item: task });
  })
);

router.post(
  '/:id/complete',
  asyncHandler(async (req, res) => {
    const task = await Task.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!task) return res.status(404).json({ error: 'Not found' });

    const now = new Date();
    task.completedAt = now;
    task.lastCompletionAt = now;
    task.totalCompletions = (task.totalCompletions || 0) + 1;
    task.streakCount = (task.streakCount || 0) + 1;
    if (task.streakCount > (task.longestStreak || 0)) {
      task.longestStreak = task.streakCount;
    }

    if (task.frequencyType && task.reminderEnabled) {
      // Recurring → reschedule and stay Pending
      task.nextReminderAt = computeNext(task, now);
      task.status = 'Pending';
    } else {
      task.status = 'Completed';
      task.nextReminderAt = null;
    }

    await task.save();
    res.json({ item: task });
  })
);

router.post(
  '/:id/skip',
  asyncHandler(async (req, res) => {
    const task = await Task.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!task) return res.status(404).json({ error: 'Not found' });

    task.missedCount = (task.missedCount || 0) + 1;
    task.streakCount = 0;
    task.status = 'Missed';
    task.nextReminderAt = task.reminderEnabled ? computeNext(task) : null;
    await task.save();
    res.json({ item: task });
  })
);

router.post(
  '/:id/archive',
  asyncHandler(async (req, res) => {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { $set: { status: 'Archived', reminderEnabled: false, nextReminderAt: null } },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Not found' });
    res.json({ item: task });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const item = await Task.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id,
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  })
);

module.exports = router;
