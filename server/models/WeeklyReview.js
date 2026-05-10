const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const WeeklyReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    weekStart: { type: Date, required: true }, // Monday at 00:00 local
    goals: { type: [GoalSchema], default: [] },
    completedTasks: { type: [String], default: [] },
    blockers: { type: [String], default: [] },
    wastedTime: { type: [String], default: [] },
    focusAreas: { type: [String], default: [] },
    reflection: { type: String, default: '' },
  },
  { timestamps: true }
);

WeeklyReviewSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

module.exports =
  mongoose.models.WeeklyReview || mongoose.model('WeeklyReview', WeeklyReviewSchema);
