#!/usr/bin/env node
// scripts/upload-videos-to-r2.mjs
// Uploads all video assets from frontend/public/ to Cloudflare R2.
// Run: node scripts/upload-videos-to-r2.mjs
//
// Required env vars (set in .env or export):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
//
// Optional:
//   R2_ENDPOINT  — custom endpoint (defaults to https://<account>.r2.cloudflarestorage.com)

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, statSync } from 'fs';
import { resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load .env from project root
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

try {
  const { config } = await import('dotenv');
  config({ path: resolve(projectRoot, '.env') });
} catch { /* dotenv not available, rely on exported env vars */ }

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_ENDPOINT,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('Missing R2 env vars. Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
  process.exit(1);
}

const endpoint = R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const VIDEO_FILES = [
  'swan.mp4', 'Swans.mp4', 'Run.mp4', 'smoke.mp4', 'forest.mp4',
  'Waves.mp4', 'fish.mp4', 'galaxy1.mp4', 'swan-golden.mp4',
  'swan-silver.mp4', 'Swan-mov-2.mp4',
];

const publicDir = resolve(projectRoot, 'frontend', 'public');

async function fileExistsInR2(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadFile(filename) {
  const filePath = resolve(publicDir, filename);

  try {
    statSync(filePath);
  } catch {
    console.warn(`  SKIP: ${filename} — file not found locally`);
    return;
  }

  const exists = await fileExistsInR2(filename);
  if (exists) {
    console.log(`  SKIP: ${filename} — already in R2`);
    return;
  }

  const body = readFileSync(filePath);
  const sizeMB = (body.length / 1024 / 1024).toFixed(1);

  console.log(`  UPLOADING: ${filename} (${sizeMB} MB)...`);

  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: filename,
    Body: body,
    ContentType: 'video/mp4',
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  console.log(`  DONE: ${filename}`);
}

console.log(`\nUploading ${VIDEO_FILES.length} videos to R2 bucket "${R2_BUCKET_NAME}"...\n`);

for (const file of VIDEO_FILES) {
  await uploadFile(file);
}

console.log('\nAll uploads complete!');
console.log(`\nNext steps:`);
console.log(`  1. Enable public access on your R2 bucket (Cloudflare dashboard → R2 → ${R2_BUCKET_NAME} → Settings → Public access)`);
console.log(`  2. Copy the public URL (e.g., https://pub-abc123.r2.dev)`);
console.log(`  3. Set VITE_R2_VIDEO_URL=<your-public-url> in:`);
console.log(`     - .env (local dev — optional, local files still work)`);
console.log(`     - Render dashboard → Environment → Add env var`);
console.log(`  4. Redeploy on Render`);
