const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Org', required: true },
  status: { type: String, default: 'draft' },
  channel: { type: String, default: 'email' }, // email | social | web
  // References the create-api Project this campaign was built from --
  // the Create -> Distribute pipeline. Deliberately a loose string, not a
  // real foreign key or cross-service call: the two services don't share a
  // database, so this is the same kind of soft reference a real two-stack
  // system would actually use between independently-owned services.
  sourceProjectId: { type: String },
  logoUrl: { type: String },
  scheduledDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
