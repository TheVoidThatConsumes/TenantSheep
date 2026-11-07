const express = require('express');
const nodemailer = require('nodemailer');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// streamTransport+buffer builds the real MIME message (the same composition
// path a real SMTP transport uses) without needing any mail server. Verified
// during development: nodemailer DOES fold/escape raw CRLF in the Subject
// line now (that specific classic attack is patched upstream) -- but two
// related things still aren't safe:
//   1. a raw, unvalidated "to" string can be parsed as RFC 5322 *group*
//      syntax, silently adding a real extra recipient
//   2. HTML body content built from unescaped user input passes straight
//      through, uninspected -- template/content injection, not header
//      injection, but the SoW's "template injection" wording covers it
const transporter = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });

// CHALLENGE 6 -- "to" field accepts a raw string, no address validation.
// Try: inviteeEmail = "victim@acme.test\r\nBcc: attacker@evil.test"
//
// CHALLENGE 7 -- inviterName flows unescaped into an HTML email body.
// Try: inviterName = "<img src=x onerror=alert(document.cookie)>"
router.post('/invite', authenticate, async (req, res) => {
  const { inviteeEmail, inviterName } = req.body;
  if (!inviteeEmail || !inviterName) {
    return res.status(400).json({ error: 'inviteeEmail and inviterName required' });
  }

  const info = await transporter.sendMail({
    from: 'noreply@tenantsheep.test',
    to: inviteeEmail, // BUG: raw string, not validated as a single clean address
    subject: 'You have been invited to TenantSheep',
    html: `<p>${inviterName} invited you to join their org.</p>`, // BUG: unescaped
  });

  res.json({ sent: true, rawMessage: info.message.toString() });
});

module.exports = router;
