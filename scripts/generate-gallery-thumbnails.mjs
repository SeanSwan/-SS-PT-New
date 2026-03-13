#!/usr/bin/env node
/**
 * Retroactive Gallery Thumbnail Generator
 * ========================================
 * Processes all existing gallery photos that lack real thumbnails.
 * Downloads each full-size JPEG from R2, generates thumb + medium variants,
 * uploads them back to R2, and updates the DB record.
 *
 * Memory-safe: processes ONE photo at a time (~14MB peak per photo).
 * Total time: ~3-5 min for 72 photos.
 *
 * Usage:
 *   node scripts/generate-gallery-thumbnails.mjs            # process all missing
 *   node scripts/generate-gallery-thumbnails.mjs --dry-run  # preview without changes
 *   node scripts/generate-gallery-thumbnails.mjs --event super-nova  # single event
 */
import 'dotenv/config';
import { Sequelize, Op } from 'sequelize';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

// ── Config ──────────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const DRY_RUN = process.argv.includes('--dry-run');
const EVENT_FILTER = process.argv.includes('--event')
  ? process.argv[process.argv.indexOf('--event') + 1]
  : null;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('❌ R2 credentials not set (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)');
  process.exit(1);
}

// ── DB Connection ───────────────────────────────────────────────────────
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
});

// ── R2 Client ───────────────────────────────────────────────────────────
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// ── Helpers ─────────────────────────────────────────────────────────────
async function downloadFromR2(key) {
  const response = await r2Client.send(new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  }));
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function uploadToR2(key, buffer) {
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

function buildUrl(key) {
  return R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`
    : `/api/serve-photo/${key}`;
}

function variantKeys(baseKey) {
  const base = baseKey.replace(/\.jpg$/i, '');
  return {
    thumbKey: `${base}_thumb.jpg`,
    mediumKey: `${base}_medium.jpg`,
  };
}

async function generateVariants(inputBuffer) {
  const metadata = await sharp(inputBuffer).metadata();

  const thumbBuffer = await sharp(inputBuffer)
    .resize(400, null, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, progressive: true, mozjpeg: true })
    .toBuffer();

  const mediumBuffer = await sharp(inputBuffer)
    .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .toBuffer();

  return {
    thumb: thumbBuffer,
    medium: mediumBuffer,
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Gallery Thumbnail Generator                     ║');
  console.log('║  Generates thumb (400px) + medium (1200px)       ║');
  console.log(`║  Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE — writing to R2 + DB'}          ║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  await sequelize.authenticate();
  console.log('✅ Database connected');

  // Find photos that need thumbnails
  // Photos without real thumbnails have thumbnailUrl === url OR mediumUrl is null
  let whereClause = `
    WHERE (medium_url IS NULL OR thumb_key IS NULL)
  `;
  if (EVENT_FILTER) {
    whereClause += ` AND event_id = (SELECT id FROM gallery_events WHERE slug = '${EVENT_FILTER.replace(/'/g, "''")}' LIMIT 1)`;
  }

  const [photos] = await sequelize.query(`
    SELECT id, storage_key, url, thumbnail_url, display_name, file_size
    FROM gallery_photos
    ${whereClause}
    ORDER BY id
  `);

  console.log(`\nFound ${photos.length} photos needing thumbnails${EVENT_FILTER ? ` (event: ${EVENT_FILTER})` : ''}\n`);

  if (photos.length === 0) {
    console.log('Nothing to do — all photos have thumbnails!');
    await sequelize.close();
    return;
  }

  let processed = 0;
  let failed = 0;
  let totalThumbBytes = 0;
  let totalMediumBytes = 0;

  for (const photo of photos) {
    const label = `[${processed + 1}/${photos.length}] ${photo.display_name}`;
    try {
      // Download full image from R2
      console.log(`${label} — downloading (${(photo.file_size / 1024 / 1024).toFixed(1)}MB)...`);
      const fullBuffer = await downloadFromR2(photo.storage_key);

      // Generate variants
      const variants = await generateVariants(fullBuffer);
      const keys = variantKeys(photo.storage_key);

      console.log(
        `${label} — thumb: ${Math.round(variants.thumb.length / 1024)}KB, ` +
        `medium: ${Math.round(variants.medium.length / 1024)}KB, ` +
        `dimensions: ${variants.width}×${variants.height}`
      );

      if (!DRY_RUN) {
        // Upload variants to R2
        await Promise.all([
          uploadToR2(keys.thumbKey, variants.thumb),
          uploadToR2(keys.mediumKey, variants.medium),
        ]);

        // Update DB
        await sequelize.query(`
          UPDATE gallery_photos SET
            thumbnail_key = :thumbKey,
            thumbnail_url = :thumbUrl,
            thumb_key = :thumbKey,
            medium_key = :mediumKey,
            medium_url = :mediumUrl,
            width = :width,
            height = :height
          WHERE id = :id
        `, {
          replacements: {
            thumbKey: keys.thumbKey,
            thumbUrl: buildUrl(keys.thumbKey),
            mediumKey: keys.mediumKey,
            mediumUrl: buildUrl(keys.mediumKey),
            width: variants.width,
            height: variants.height,
            id: photo.id,
          },
        });

        console.log(`${label} ✅ done`);
      } else {
        console.log(`${label} ✅ (dry run — no changes written)`);
      }

      totalThumbBytes += variants.thumb.length;
      totalMediumBytes += variants.medium.length;
      processed++;
    } catch (err) {
      console.error(`${label} ❌ FAILED: ${err.message}`);
      failed++;
    }

    // GC every 10 photos
    if (processed % 10 === 0 && global.gc) global.gc();
  }

  console.log('\n════════════════════════════════════════════════');
  console.log(`Results: ${processed} processed, ${failed} failed`);
  console.log(`Thumbnails: ${(totalThumbBytes / 1024 / 1024).toFixed(1)}MB total (avg ${Math.round(totalThumbBytes / Math.max(processed, 1) / 1024)}KB each)`);
  console.log(`Mediums: ${(totalMediumBytes / 1024 / 1024).toFixed(1)}MB total (avg ${Math.round(totalMediumBytes / Math.max(processed, 1) / 1024)}KB each)`);
  console.log('════════════════════════════════════════════════\n');

  await sequelize.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
