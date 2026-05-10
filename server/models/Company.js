const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    website: { type: String, trim: true },
    domain: { type: String, trim: true, lowercase: true },
    notes: { type: String, default: '' },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

CompanySchema.index({ userId: 1, name: 1 });

module.exports = mongoose.models.Company || mongoose.model('Company', CompanySchema);
