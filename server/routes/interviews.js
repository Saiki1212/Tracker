const router = require('express').Router();
const Interview = require('../models/Interview');
const buildCrud = require('../utils/crud');

const c = buildCrud(Interview, {
  sort: { scheduledAt: -1, createdAt: -1 },
  populate: { path: 'applicationId', select: 'role companyName companyId status' },
});

router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.get);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;
