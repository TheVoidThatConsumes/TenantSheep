const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const ASSET_ROOT = path.join(__dirname, '..', 'sample-assets');

// CHALLENGE 5 -- path traversal. filename is never sanitized or contained.
// Try: GET /api/assets/download?file=../secret.txt
router.get('/download', authenticate, (req, res) => {
  const filename = req.query.file;
  if (!filename) return res.status(400).json({ error: 'file required' });

  const target = path.join(ASSET_ROOT, filename); // BUG: no basename(), no containment check
  fs.readFile(target, (err, data) => {
    if (err) return res.status(404).json({ error: 'not found' });
    res.send(data);
  });
});

module.exports = router;
