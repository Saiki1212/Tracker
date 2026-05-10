const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    q: { type: String, required: true },
    topic: { type: String, default: '' },
    answeredWell: { type: Boolean, default: false },
  },
  { _id: false }
);

const InterviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    roundType: {
      type: String,
      enum: ['Recruiter', 'OA', 'Technical', 'SystemDesign', 'Behavioral', 'Final'],
      default: 'Technical',
    },
    interviewer: { type: String, default: '' },
    scheduledAt: { type: Date },
    durationMin: { type: Number, default: 60 },
    questions: { type: [QuestionSchema], default: [] },
    mistakes: { type: [String], default: [] },
    weakConcepts: { type: [String], default: [] },
    communicationIssues: { type: [String], default: [] },
    confidence: { type: Number, min: 1, max: 5, default: 3 },
    outcome: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'ghosted'],
      default: 'pending',
    },
    recordingUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

InterviewSchema.index({ userId: 1, scheduledAt: -1 });

module.exports = mongoose.models.Interview || mongoose.model('Interview', InterviewSchema);
