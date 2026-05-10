const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    version: { type: String, required: true, trim: true },
    targetRole: { type: String, default: '' },
    driveUrl: { type: String, default: '' },
    skillsHighlighted: { type: [String], default: [] },
    projectsIncluded: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    atsKeywords: { type: [String], default: [] },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

ResumeSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);
