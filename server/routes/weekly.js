const router = require('express').Router();
const WeeklyReview = require('../models/WeeklyReview');
const asyncHandler = require('../utils/asyncHandler');

function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await WeeklyReview.find({ userId: req.user.id })
      .sort({ weekStart: -1 })
      .lean();
    res.json({ items });
  })
);

router.get(
  '/current',
  asyncHandler(async (req, res) => {
    const ws = startOfWeek();
    let item = await WeeklyReview.findOne({ userId: req.user.id, weekStart: ws });
    if (!item) {
      item = await WeeklyReview.create({ userId: req.user.id, weekStart: ws });
    }
    res.json({ item });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const ws = req.body.weekStart ? new Date(req.body.weekStart) : startOfWeek();
    ws.setHours(0, 0, 0, 0);
    const item = await WeeklyReview.findOneAndUpdate(
      { userId: req.user.id, weekStart: ws },
      { $setOnInsert: { userId: req.user.id, weekStart: ws } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ item });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const item = await WeeklyReview.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).lean();
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ item });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const patch = { ...req.body };
    delete patch.userId;
    delete patch._id;
    const item = await WeeklyReview.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      patch,
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ item });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const item = await WeeklyReview.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  })
);

module.exports = router;
