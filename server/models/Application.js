const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    companyName: { type: String, default: '' }, // denormalized fallback
    role: { type: String, required: true, trim: true },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    salaryCurrency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['Wishlist', 'Applied', 'OA', 'Interviewing', 'Rejected', 'Offer'],
      default: 'Wishlist',
      index: true,
    },
    source: { type: String, default: '' },
    recruiterName: { type: String, default: '' },
    recruiterContact: { type: String, default: '' },
    appliedAt: { type: Date },
    nextFollowUpAt: { type: Date, index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
    jdUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    rejectionTags: { type: [String], default: [] },
  },
  { timestamps: true }
);

ApplicationSchema.index({ userId: 1, createdAt: -1 });
ApplicationSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.models.Application || mongoose.model('Application', ApplicationSchema);
