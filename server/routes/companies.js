const router = require('express').Router();
const Company = require('../models/Company');
const buildCrud = require('../utils/crud');

const c = buildCrud(Company, { sort: { name: 1 } });

router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.get);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;
