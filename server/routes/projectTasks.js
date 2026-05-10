const router = require('express').Router({ mergeParams: true });
const ProjectTask = require('../models/ProjectTask');
const Project = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');

// All routes are nested under /projects/:id/tasks
async function ensureProject(userId, projectId) {
  const p = await Project.findOne({ _id: projectId, userId }).select('_id').lean();
  return !!p;
}

router.get(
  '/:id/tasks',
  asyncHandler(async (req, res) => {
    if (!(await ensureProject(req.user.id, req.params.id)))
      return res.status(404).json({ error: 'Project not found' });
    const items = await ProjectTask.find({
      userId: req.user.id,
      projectId: req.params.id,
    })
      .sort({ status: 1, order: 1, createdAt: 1 })
      .lean();
    res.json({ items });
  })
);

router.post(
  '/:id/tasks',
  asyncHandler(async (req, res) => {
    if (!(await ensureProject(req.user.id, req.params.id)))
      return res.status(404).json({ error: 'Project not found' });
    const last = await ProjectTask.findOne({
      userId: req.user.id,
      projectId: req.params.id,
      status: req.body.status || 'todo',
    })
      .sort({ order: -1 })
      .select('order')
      .lean();
    const item = await ProjectTask.create({
      ...req.body,
      userId: req.user.id,
      projectId: req.params.id,
      order: (last?.order ?? -1) + 1,
    });
    res.status(201).json({ item });
  })
);

router.patch(
  '/:id/tasks/reorder',
  asyncHandler(async (req, res) => {
    // body: { updates: [{ taskId, status, order }, ...] }
    const updates = Array.isArray(req.body.updates) ? req.body.updates : [];
    await Promise.all(
      updates.map((u) =>
        ProjectTask.updateOne(
          { _id: u.taskId, userId: req.user.id, projectId: req.params.id },
          { $set: { status: u.status, order: u.order } }
        )
      )
    );
    res.json({ ok: true });
  })
);

router.patch(
  '/:id/tasks/:taskId',
  asyncHandler(async (req, res) => {
    const patch = { ...req.body };
    delete patch.userId;
    delete patch._id;
    delete patch.projectId;
    const item = await ProjectTask.findOneAndUpdate(
      { _id: req.params.taskId, userId: req.user.id, projectId: req.params.id },
      patch,
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ item });
  })
);

router.delete(
  '/:id/tasks/:taskId',
  asyncHandler(async (req, res) => {
    const item = await ProjectTask.findOneAndDelete({
      _id: req.params.taskId,
      userId: req.user.id,
      projectId: req.params.id,
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  })
);

module.exports = router;
