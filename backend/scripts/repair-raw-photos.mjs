#!/usr/bin/env node
/**
 * repair-raw-photos.mjs
 * =====================
 * Scans gallery photos in R2 for oversized objects (likely RAW ARW files that
 * were uploaded without conversion due to OOM). Downloads each one, converts
 * to JPEG via sharp, re-uploads, and updates the DB record.
 *
 * Usage:
 *   node backend/scripts/repair-raw-photos.mjs                  # dry-run (default)
 *   node backend/scripts/repair-raw-photos.mjs --execute         # actually repair
 *   node backend/scripts/repair-raw-photos.mjs --event super-nova --execute
 *   node backend/scripts/repair-raw-photos.mjs --threshold 5     # MB threshold (default 10)
 *
 * Options:
 *   --execute       Actually download, convert, and re-upload (without this, dry-run only)
 *   --event <slug>  Only repair photos for a specific event slug (default: all events)
 *   --threshold <N> Size threshold in MB above which a photo is considered broken (default: 10)
 *   --photo <id>    Repair a single photo by DB id
 */

import 'dotenv/config';
import { Sequelize } from 'sequelize';
import sharp from 'sharp';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

// ── Parse CLI args ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');
const eventSlugArg = args.includes('--event') ? args[args.indexOf('--event') + 1] : null;
const thresholdMB = args.includes('--threshold')
  ? parseFloat(args[args.indexOf('--threshold') + 1])
  : 10;
const singlePhotoId = args.includes('--photo')
  ? parseInt(args[args.indexOf('--photo') + 1], 10)
  : null;

const THRESHOLD_BYTES = thresholdMB * 1024 * 1024;
const JPEG_QUALITY = 92;
const MAX_DIMENSION = 4000;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║           GALLERY RAW PHOTO REPAIR SCRIPT                  ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log(`Mode:       ${dryRun ? 'DRY RUN (use --execute to apply)' : 'EXECUTE — will modify R2 objects'}`);
console.log(`Event:      ${eventSlugArg || 'ALL events'}`);
console.log(`Threshold:  ${thresholdMB} MB`);
if (singlePhotoId) console.log(`Photo ID:   ${singlePhotoId}`);
console.log('');

// ── Database connection ──────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set in environment');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: DATABASE_URL.includes('render.com')
      ? { require: true, rejectUnauthorized: false }
      : undefined,
  },
});

// ── R2 client ────────────────────────────────────────────────────────────────

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_ENDPOINT,
  R2_PUBLIC_URL,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('ERROR: R2 env vars not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)');
  process.exit(1);
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getR2ObjectSize(key) {
  try {
    const resp = await r2Client.send(new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }));
    return resp.ContentLength;
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return null; // Object doesn't exist
    }
    throw err;
  }
}

async function downloadR2Object(key) {
  const resp = await r2Client.send(new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  }));
  // Collect stream into buffer
  const chunks = [];
  for await (const chunk of resp.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function uploadR2Object(key, buffer, contentType = 'image/jpeg') {
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
}

function formatSize(bytes) {
  if (bytes === null || bytes === undefined) return 'unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Connect to DB
  await sequelize.authenticate();
  console.log('Connected to database.\n');

  // Build query
  const whereClause = [];
  const replacements = {};

  if (singlePhotoId) {
    whereClause.push('gp.id = :photoId');
    replacements.photoId = singlePhotoId;
  }

  if (eventSlugArg) {
    whereClause.push('ge.slug = :slug');
    replacements.slug = eventSlugArg;
  }

  const whereSQL = whereClause.length > 0
    ? 'WHERE ' + whereClause.join(' AND ')
    : '';

  const [photos] = await sequelize.query(`
    SELECT gp.id, gp.storage_key, gp.display_name, gp.file_size, gp.url,
           gp.photo_number, gp.event_id, ge.slug AS event_slug, ge.name AS event_name
    FROM gallery_photos gp
    JOIN gallery_events ge ON ge.id = gp.event_id
    ${whereSQL}
    ORDER BY ge.slug, gp.photo_number
  `, { replacements });

  console.log(`Found ${photos.length} gallery photo(s) to check.\n`);

  let checkedCount = 0;
  let brokenCount = 0;
  let repairedCount = 0;
  let errorCount = 0;
  const results = [];

  for (const photo of photos) {
    checkedCount++;
    const { id, storage_key, display_name, file_size, event_slug } = photo;

    process.stdout.write(`[${checkedCount}/${photos.length}] ${display_name} (${storage_key}) ... `);

    try {
      // Check actual R2 object size
      const r2Size = await getR2ObjectSize(storage_key);

      if (r2Size === null) {
        console.log(`MISSING in R2 (skipped)`);
        results.push({ id, display_name, storage_key, status: 'missing' });
        continue;
      }

      // Check if oversized (likely raw ARW)
      if (r2Size < THRESHOLD_BYTES) {
        console.log(`OK (${formatSize(r2Size)})`);
        results.push({ id, display_name, storage_key, status: 'ok', r2Size });
        continue;
      }

      // This photo is likely a raw ARW stored as .jpg
      brokenCount++;
      console.log(`BROKEN — ${formatSize(r2Size)} (exceeds ${thresholdMB}MB threshold)`);
      results.push({ id, display_name, storage_key, status: 'broken', r2Size });

      if (dryRun) {
        console.log(`  → Would download, convert to JPEG, and re-upload (dry run)\n`);
        continue;
      }

      // ── REPAIR ──
      console.log(`  → Downloading ${formatSize(r2Size)} from R2...`);
      const rawBuffer = await downloadR2Object(storage_key);
      console.log(`  → Downloaded. Converting RAW → JPEG (quality ${JPEG_QUALITY}, max ${MAX_DIMENSION}px)...`);

      const jpegBuffer = await sharp(rawBuffer, { limitInputPixels: false })
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();

      console.log(`  → Converted: ${formatSize(rawBuffer.length)} → ${formatSize(jpegBuffer.length)}`);

      // Upload converted JPEG back to the same key
      console.log(`  → Re-uploading to R2 key: ${storage_key}`);
      await uploadR2Object(storage_key, jpegBuffer);

      // Update DB record
      const newUrl = R2_PUBLIC_URL
        ? `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${storage_key}`
        : `/api/serve-photo/${storage_key}`;

      await sequelize.query(`
        UPDATE gallery_photos
        SET file_size = :fileSize,
            mime_type = 'image/jpeg',
            url = :url,
            thumbnail_url = :thumbnailUrl,
            metadata = jsonb_set(
              COALESCE(metadata, '{}'),
              '{repaired}',
              :repairMeta::jsonb
            ),
            updated_at = NOW()
        WHERE id = :id
      `, {
        replacements: {
          id,
          fileSize: jpegBuffer.length,
          url: newUrl,
          thumbnailUrl: newUrl,
          repairMeta: JSON.stringify({
            repairedAt: new Date().toISOString(),
            originalR2Size: r2Size,
            convertedSize: jpegBuffer.length,
            reason: 'RAW ARW file stored without JPEG conversion (OOM during upload)',
          }),
        },
      });

      repairedCount++;
      console.log(`  → REPAIRED successfully\n`);

    } catch (err) {
      errorCount++;
      console.log(`ERROR: ${err.message}`);
      results.push({ id, display_name, storage_key, status: 'error', error: err.message });
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`Total checked:  ${checkedCount}`);
  console.log(`OK:             ${checkedCount - brokenCount - errorCount}`);
  console.log(`Broken:         ${brokenCount}`);
  if (!dryRun) console.log(`Repaired:       ${repairedCount}`);
  console.log(`Errors:         ${errorCount}`);
  console.log(`Missing in R2:  ${results.filter(r => r.status === 'missing').length}`);
  if (dryRun && brokenCount > 0) {
    console.log(`\nRun with --execute to repair the ${brokenCount} broken photo(s).`);
  }
}

main()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nFATAL ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
