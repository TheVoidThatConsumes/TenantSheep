// A small, local, harmless stand-in for the 169.254.169.254-style cloud
// metadata endpoint. Used as the SSRF target for CHALLENGE 4 in secondary-api,
// so the SSRF -> "steal credentials" chain is demonstrable entirely locally,
// with zero risk and zero resemblance to any real cloud account. Everything
// returned here is fake.

const express = require('express');
const app = express();

app.get('/latest/meta-data/iam/security-credentials/', (req, res) => {
  res.send('tenantsheep-demo-role');
});

app.get('/latest/meta-data/iam/security-credentials/:role', (req, res) => {
  res.json({
    Code: 'Success',
    AccessKeyId: 'AKIA-DECOY-NOT-REAL-00000000',
    SecretAccessKey: 'decoy/secret/not-real/0000000000000000000000',
    Token: 'decoy-session-token-not-real',
    Expiration: '2099-01-01T00:00:00Z',
  });
});

app.listen(1338, () => console.log('decoy-metadata listening on 1338 (fake data only)'));
