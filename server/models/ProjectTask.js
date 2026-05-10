const mongoose = require('mongoose');

const ProjectTaskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['backlog', 'todo', 'doing', 'blocked', 'done'],
      default: 'todo',
    },
    priority: { type: String, enum: ['P0', 'P1', 'P2', 'P3'], default: 'P2' },
    module: { type: String, default: '' },
    blockerNote: { type: String, default: '' },
    dueDate: { type: Date },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProjectTaskSchema.index({ projectId: 1, status: 1, order: 1 });

module.exports =
  mongoose.models.ProjectTask || mongoose.model('ProjectTask', ProjectTaskSchema);
