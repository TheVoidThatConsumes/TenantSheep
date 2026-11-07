const express = require('express');
const Operator = require('../models/Operator');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authenticate, async (req, res) => {
  const operator = await Operator.findById(req.user.operatorId);
  res.json({ id: operator._id, email: operator.email, role: operator.role });
});

// CHALLENGE 8 -- privilege escalation. No allowlist of updatable fields:
// an operator can PUT their own profile and simply set role to "admin".
// Same missing-allowlist shape as create-api's mass-assignment bug (CHALLENGE
// 3 there), applied to a different field here -- worth noticing that a
// missing-allowlist pattern, once introduced, tends to show up more than
// once in the same codebase.
router.put('/me', authenticate, async (req, res) => {
  const operator = await Operator.findByIdAndUpdate(req.user.operatorId, req.body, { new: true });
  res.json({ id: operator._id, email: operator.email, role: operator.role });
});

module.exports = router;
