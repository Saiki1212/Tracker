const mongoose = require('mongoose');

const VALID_THEMES = [
  'midnight', 'graphite', 'onyx', 'carbon',
  'paper', 'frost', 'linen', 'pearl',
];

const UserSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    theme: {
      type: String,
      enum: VALID_THEMES,
      default: 'midnight',
    },
  },
  { timestamps: true }
);

UserSettingsSchema.statics.VALID_THEMES = VALID_THEMES;

module.exports =
  mongoose.models.UserSettings || mongoose.model('UserSettings', UserSettingsSchema);
