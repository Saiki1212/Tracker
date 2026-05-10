const router = require('express').Router();
const Project = require('../models/Project');
const buildCrud = require('../utils/crud');

const c = buildCrud(Project);

router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.get);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;
