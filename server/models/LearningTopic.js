const mongoose = require('mongoose');

const LearningTopicSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['backend', 'systemDesign', 'db', 'devops', 'lang', 'other'],
      default: 'other',
    },
    kind: { type: String, enum: ['deep', 'quick'], default: 'deep' },
    confidence: { type: Number, min: 1, max: 5, default: 3 },
    revisionCount: { type: Number, default: 0 },
    lastRevisedAt: { type: Date },
    interviewFrequency: { type: Number, min: 1, max: 5, default: 3 },
    relatedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    body: { type: String, default: '' },
  },
  { timestamps: true }
);

LearningTopicSchema.index({ userId: 1, kind: 1, createdAt: -1 });

module.exports =
  mongoose.models.LearningTopic || mongoose.model('LearningTopic', LearningTopicSchema);
