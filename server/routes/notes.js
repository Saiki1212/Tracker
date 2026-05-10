const router = require('express').Router();
const Note = require('../models/Note');
const buildCrud = require('../utils/crud');

const c = buildCrud(Note, { sort: { pinned: -1, createdAt: -1 } });

router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.get);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;
