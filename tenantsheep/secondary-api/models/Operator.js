const mongoose = require('mongoose');

const operatorSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
  role: { type: String, default: 'operator' },
}, { timestamps: true });

module.exports = mongoose.model('Operator', operatorSchema);
