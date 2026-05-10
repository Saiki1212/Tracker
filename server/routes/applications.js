const router = require('express').Router();
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const buildCrud = require('../utils/crud');
const asyncHandler = require('../utils/asyncHandler');

const c = buildCrud(Application, {
  sort: { createdAt: -1 },
  populate: [
    { path: 'companyId', select: 'name domain website' },
    { path: 'resumeId', select: 'version targetRole' },
  ],
});

router.get('/', c.list);
router.post('/', c.create);

// Board grouped by status
router.get(
  '/board',
  asyncHandler(async (req, res) => {
    const apps = await Application.find({ userId: req.user.id })
      .populate('companyId', 'name domain')
      .populate('resumeId', 'version')
      .sort({ updatedAt: -1 })
      .lean();
    const statuses = ['Wishlist', 'Applied', 'OA', 'Interviewing', 'Rejected', 'Offer'];
    const board = Object.fromEntries(statuses.map((s) => [s, []]));
    apps.forEach((a) => board[a.status]?.push(a));
    res.json({ board });
  })
);

router.get(
  '/:id/interviews',
  asyncHandler(async (req, res) => {
    const items = await Interview.find({
      userId: req.user.id,
      applicationId: req.params.id,
    })
      .sort({ scheduledAt: 1, createdAt: 1 })
      .lean();
    res.json({ items });
  })
);

router.get('/:id', c.get);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;
