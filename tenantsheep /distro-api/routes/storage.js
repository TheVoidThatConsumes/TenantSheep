const express = require('express');
const Minio = require('minio');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'tenantsheep',
  secretKey: process.env.MINIO_SECRET_KEY || 'tenantsheep123',
});

const BUCKET = 'tenantsheep-assets';
const PRESIGN_SECONDS = 24 * 60 * 60; // 24h -- SoW names over-scoped presigned URLs explicitly

async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET).catch(() => false);
  if (!exists) await minioClient.makeBucket(BUCKET);
}

// CHALLENGE 10 -- S3-style presigned URL scoping. Object keys have no orgId
// prefix (just the raw filename), and the presigned URL is valid for 24h.
// One tenant can guess/enumerate another tenant's object keys (predictable
// filenames like "logo.png", "export.zip") and read or overwrite them
// within that window -- no bucket policy or key-prefix isolation at all.
router.post('/:id/upload-url', authenticate, async (req, res) => {
  await ensureBucket();
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename required' });
  const objectKey = filename; // BUG: no `${req.user.orgId}/` prefix
  const url = await minioClient.presignedPutObject(BUCKET, objectKey, PRESIGN_SECONDS);
  res.json({ uploadUrl: url, objectKey });
});

router.get('/download-url', authenticate, async (req, res) => {
  await ensureBucket();
  const objectKey = req.query.key;
  if (!objectKey) return res.status(400).json({ error: 'key required' });
  const url = await minioClient.presignedGetObject(BUCKET, objectKey, PRESIGN_SECONDS);
  res.json({ downloadUrl: url });
});

module.exports = router;
