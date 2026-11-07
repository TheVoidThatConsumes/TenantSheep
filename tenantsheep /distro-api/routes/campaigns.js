const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Campaign = require('../models/Campaign');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Correctly scoped -- the baseline to compare the vulnerable routes against.
router.get('/', authenticate, async (req, res) => {
  const campaigns = await Campaign.find({ orgId: req.user.orgId });
  res.json(campaigns);
});

// CHALLENGE 1 -- NoSQL injection, tenant filter overridable.
// userFilter is merged in AFTER orgId, so a crafted filter can override it.
// Try: GET /api/campaigns/search?filter={"orgId":{"$ne":null}}
router.get('/search', authenticate, async (req, res) => {
  let userFilter = {};
  if (req.query.filter) {
    try { userFilter = JSON.parse(req.query.filter); } catch (e) { /* ignore bad JSON */ }
  }
  const query = Object.assign({ orgId: req.user.orgId }, userFilter);
  const campaigns = await Campaign.find(query);
  res.json(campaigns);
});

// CHALLENGE 2 -- missing tenant-scope check entirely (IDOR/BOLA).
// Should also filter { orgId: req.user.orgId }. It doesn't.
router.get('/:id', authenticate, async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'not found' });
  res.json(campaign);
});

router.post('/', authenticate, async (req, res) => {
  const campaign = await Campaign.create({ name: req.body.name, orgId: req.user.orgId });
  res.status(201).json(campaign);
});

// CHALLENGE 3 -- jwt.decode() instead of jwt.verify(). No signature check at
// all, so a hand-crafted token (no secret needed) is trusted outright.
router.get('/:id/preview-legacy', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });

  const payload = jwt.decode(token); // BUG: decode(), not verify()
  if (!payload) return res.status(401).json({ error: 'invalid token' });

  const campaign = await Campaign.findOne({ _id: req.params.id, orgId: payload.orgId });
  res.json({ preview: true, claimedOrgId: payload.orgId, campaign });
});

// CHALLENGE 4 -- SSRF via logo-import-from-URL, no allowlist, no scheme check.
// Try pointing url at http://decoy-metadata:1338/latest/meta-data/iam/security-credentials/
router.post('/:id/logo-from-url', authenticate, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const response = await axios.get(url, { timeout: 3000 });
    res.json({ fetched: true, status: response.status, bodyPreview: String(response.data).slice(0, 800) });
  } catch (e) {
    res.status(400).json({ error: 'fetch failed', detail: e.message });
  }
});

module.exports = router;
