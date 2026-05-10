const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, lowercase: true },
    description: { type: String, default: '' },
    architectureNotes: { type: String, default: '' },
    techStack: { type: [String], default: [] },
    githubUrl: { type: String, default: '' },
    liveUrl: { type: String, default: '' },
    screenshots: { type: [String], default: [] },
    deploymentStatus: {
      type: String,
      enum: ['planned', 'building', 'live', 'archived'],
      default: 'planned',
    },
    lessonsLearned: { type: String, default: '' },
    resumeImpact: { type: String, default: '' },
    scalabilityConcepts: { type: [String], default: [] },
    progressPct: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

ProjectSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
