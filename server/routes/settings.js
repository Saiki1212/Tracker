const router = require('express').Router();
const UserSettings = require('../models/UserSettings');
const asyncHandler = require('../utils/asyncHandler');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    let doc = await UserSettings.findOne({ userId: req.user.id }).lean();
    if (!doc) {
      doc = await UserSettings.create({ userId: req.user.id });
      doc = doc.toObject();
    }
    res.json({ settings: { theme: doc.theme } });
  })
);

router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const { theme } = req.body || {};
    const patch = {};
    if (theme !== undefined) {
      if (!UserSettings.VALID_THEMES.includes(theme)) {
        return res.status(400).json({
          error: 'Invalid theme',
          allowed: UserSettings.VALID_THEMES,
        });
      }
      patch.theme = theme;
    }
    const doc = await UserSettings.findOneAndUpdate(
      { userId: req.user.id },
      { $set: patch },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ settings: { theme: doc.theme } });
  })
);

module.exports = router;
