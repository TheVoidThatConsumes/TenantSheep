const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Operator = require('../models/Operator');
const { SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const operator = await Operator.findOne({ email });
  if (!operator) return res.status(401).json({ error: 'invalid credentials' });

  const ok = await bcrypt.compare(password, operator.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const token = jwt.sign(
    { operatorId: operator._id, orgId: operator.orgId, role: operator.role },
    SECRET,
    { algorithm: 'HS256', expiresIn: '8h' }
  );
  res.json({ token });
});

module.exports = router;
