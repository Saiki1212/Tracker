const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ['debug', 'architecture', 'snippet', 'command', 'interview'],
      default: 'snippet',
    },
    tags: { type: [String], default: [] },
    body: { type: String, default: '' },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NoteSchema.index({ userId: 1, pinned: -1, createdAt: -1 });

module.exports = mongoose.models.Note || mongoose.model('Note', NoteSchema);
