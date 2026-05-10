const router = require('express').Router();
const a = require('../utils/analytics');
const asyncHandler = require('../utils/asyncHandler');

router.get('/overview', asyncHandler(async (req, res) => res.json(await a.overview(req.user.id))));
router.get(
  '/applications-timeline',
  asyncHandler(async (req, res) => res.json({ items: await a.applicationsTimeline(req.user.id) }))
);
router.get(
  '/rejection-reasons',
  asyncHandler(async (req, res) => res.json({ items: await a.rejectionReasons(req.user.id) }))
);
router.get(
  '/interview-performance',
  asyncHandler(async (req, res) => res.json({ items: await a.interviewPerformance(req.user.id) }))
);
router.get(
  '/resume-performance',
  asyncHandler(async (req, res) => res.json({ items: await a.resumePerformance(req.user.id) }))
);
router.get(
  '/weak-concepts',
  asyncHandler(async (req, res) => res.json(await a.weakConcepts(req.user.id)))
);
router.get(
  '/consistency',
  asyncHandler(async (req, res) => res.json(await a.consistency(req.user.id)))
);

module.exports = router;
