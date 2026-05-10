const router = require('express').Router();
const LearningTopic = require('../models/LearningTopic');
const buildCrud = require('../utils/crud');
const asyncHandler = require('../utils/asyncHandler');

const c = buildCrud(LearningTopic);

router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.get);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

router.post(
  '/:id/revise',
  asyncHandler(async (req, res) => {
    const item = await LearningTopic.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $inc: { revisionCount: 1 }, $set: { lastRevisedAt: new Date() } },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ item });
  })
);

module.exports = router;
