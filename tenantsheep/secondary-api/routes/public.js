const express = require('express');
const Org = require('../models/Org');
const Campaign = require('../models/Campaign');

const router = express.Router();

// CHALLENGE 9 -- host header trust. A "public campaign status" page resolves
// which org to show based on the Host/X-Forwarded-Host header, with no
// validation that the request actually arrived via that real domain. Unauth-
// enticated by design (it's meant to be a public status page) -- but it lets
// anyone enumerate org names and see "active" campaigns cross-tenant just by
// sending a different Host header.
// Try: curl -H "Host: acme.tenantsheep.test" http://localhost:4000/api/public/status
router.get('/status', async (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const subdomain = host.split('.')[0];
  if (!subdomain) return res.status(400).json({ error: 'no host' });

  const org = await Org.findOne({ name: new RegExp(subdomain, 'i') });
  if (!org) return res.status(404).json({ error: 'org not found' });

  const campaigns = await Campaign.find({ orgId: org._id, status: 'active' });
  res.json({ org: org.name, activeCampaigns: campaigns.map((c) => c.name) });
});

module.exports = router;
