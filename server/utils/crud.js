/**
 * Generic CRUD route factory scoped to req.user.id.
 * Mounts: GET / , POST / , GET /:id , PATCH /:id , DELETE /:id
 */
const asyncHandler = require('./asyncHandler');

function buildCrud(Model, opts = {}) {
  const {
    sort = { createdAt: -1 },
    populate = null,
    beforeCreate = null,
    beforeUpdate = null,
    listFilter = null,
  } = opts;

  const list = asyncHandler(async (req, res) => {
    const filter = { userId: req.user.id, ...(listFilter ? listFilter(req) : {}) };
    let q = Model.find(filter).sort(sort);
    if (populate) q = q.populate(populate);
    const items = await q.lean();
    res.json({ items });
  });

  const create = asyncHandler(async (req, res) => {
    const body = beforeCreate ? await beforeCreate(req.body, req) : req.body;
    const doc = await Model.create({ ...body, userId: req.user.id });
    res.status(201).json({ item: doc });
  });

  const get = asyncHandler(async (req, res) => {
    let q = Model.findOne({ _id: req.params.id, userId: req.user.id });
    if (populate) q = q.populate(populate);
    const item = await q.lean();
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ item });
  });

  const update = asyncHandler(async (req, res) => {
    const patch = beforeUpdate ? await beforeUpdate(req.body, req) : req.body;
    delete patch.userId;
    delete patch._id;
    const item = await Model.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      patch,
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ item });
  });

  const remove = asyncHandler(async (req, res) => {
    const item = await Model.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });

  return { list, create, get, update, remove };
}

module.exports = buildCrud;
