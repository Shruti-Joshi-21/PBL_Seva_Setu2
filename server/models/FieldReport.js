const mongoose = require('mongoose');

const FieldReportSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    attendance: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceRecord' },
    description: { type: String, required: true, trim: true },
    images: [{ type: String }],
    status: { type: String, enum: ['SUBMITTED', 'APPROVED', 'REJECTED'], default: 'SUBMITTED' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FieldReport', FieldReportSchema);

