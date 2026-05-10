const router = require('express').Router();
const Resume = require('../models/Resume');
const Application = require('../models/Application');
const buildCrud = require('../utils/crud');
const asyncHandler = require('../utils/asyncHandler');

const c = buildCrud(Resume);

router.get('/', c.list);
router.post('/', c.create);

router.get(
  '/:id/performance',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const resumeId = req.params.id;
    const apps = await Application.find({ userId, resumeId }).select('status').lean();
    const total = apps.length;
    const counts = apps.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});
    const callbacks =
      (counts.OA || 0) + (counts.Interviewing || 0) + (counts.Offer || 0);
    const interviews = (counts.Interviewing || 0) + (counts.Offer || 0);
    const offers = counts.Offer || 0;
    const rate = (n) => (total ? +(n / total * 100).toFixed(1) : 0);
    res.json({
      total,
      counts,
      callbackRate: rate(callbacks),
      interviewRate: rate(interviews),
      offerRate: rate(offers),
    });
  })
);

router.get('/:id', c.get);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;
