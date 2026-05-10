const mongoose = require('mongoose');

const CATEGORIES = [
  'Learning',
  'Resume',
  'Job Applications',
  'Interview Prep',
  'Networking',
  'Project Work',
  'Daily Review',
  'Weekly Review',
];

const STATUSES = ['Pending', 'In Progress', 'Completed', 'Missed', 'Archived'];

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM', 'WEEKDAYS_ONLY'];

const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];

const CustomFrequencySchema = new mongoose.Schema(
  {
    intervalDays: { type: Number, min: 1, max: 365 },
    daysOfWeek: { type: [Number], default: [] }, // 0=Sun .. 6=Sat
  },
  { _id: false }
);

const ReminderEventSchema = new mongoose.Schema(
  {
    sentAt: { type: Date, required: true },
    delivered: { type: Boolean, default: true },
    error: String,
  },
  { _id: false }
);

const TaskSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    notes: { type: String, default: '', maxlength: 4000 },

    category: { type: String, enum: CATEGORIES, default: 'Daily Review', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'P2' },
    status: { type: String, enum: STATUSES, default: 'Pending', index: true },

    // Reminder configuration
    reminderEnabled: { type: Boolean, default: true },
    frequencyType: { type: String, enum: FREQUENCIES, default: 'DAILY' },
    customFrequency: { type: CustomFrequencySchema, default: () => ({}) },
    reminderTime: {
      type: String,
      default: '09:00',
      validate: {
        validator: (v) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(v),
        message: 'reminderTime must be HH:MM',
      },
    },

    nextReminderAt: { type: Date, index: true },
    lastReminderSentAt: { type: Date },
    reminderHistory: { type: [ReminderEventSchema], default: [] },

    // Completion tracking
    completedAt: { type: Date },
    lastCompletionAt: { type: Date },
    streakCount: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    missedCount: { type: Number, default: 0, min: 0 },
    totalCompletions: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

TaskSchema.index({ createdBy: 1, nextReminderAt: 1 });
TaskSchema.index({ createdBy: 1, status: 1, priority: 1 });

TaskSchema.statics.CATEGORIES = CATEGORIES;
TaskSchema.statics.STATUSES = STATUSES;
TaskSchema.statics.FREQUENCIES = FREQUENCIES;
TaskSchema.statics.PRIORITIES = PRIORITIES;

module.exports = mongoose.models.Task || mongoose.model('Task', TaskSchema);
