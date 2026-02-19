#!/usr/bin/env node

/**
 * backfill-video-catalog.mjs
 * ==========================
 * Migrates data from the legacy `exercise_videos` table into the new `video_catalog` table.
 *
 * MODES:
 *   DRY-RUN (default):  Reads exercise_videos, computes the full transform, prints a
 *                        summary, writes `backfill-duplicate-report.json`, but performs
 *                        ZERO database writes.
 *   CONFIRM (--confirm): Same as above, plus INSERTs rows into video_catalog inside a
 *                        single transaction (all-or-nothing).
 *
 * FLAGS:
 *   --confirm           Required to perform actual writes.
 *   --force-over-20     Allow migration when >20 duplicate YouTube video_id groups exist.
 *                        Without this flag the script hard-aborts (exit 1) as a safety net.
 *
 * DEDUP STRATEGY (YouTube entries):
 *   1. Group rows by youtube_video_id (extracted from `video_id` column).
 *   2. Pick the row with the LOWEST `id` (UUID sort, deterministic) as canonical.
 *   3. Non-canonical rows are skipped; their exercise_id associations are logged to
 *      `backfill-duplicate-report.json` so they can be manually reconciled.
 *
 * MAPPING RULES:
 *   See inline comments in `transformRow()`.
 *
 * USAGE:
 *   # Dry-run (safe, no writes):
 *   DATABASE_URL=postgres://... node backend/scripts/backfill-video-catalog.mjs
 *
 *   # Actual migration:
 *   DATABASE_URL=postgres://... node backend/scripts/backfill-video-catalog.mjs --confirm
 *
 *   # Override >20 duplicate safety:
 *   DATABASE_URL=postgres://... node backend/scripts/backfill-video-catalog.mjs --confirm --force-over-20
 */

import { Sequelize, QueryTypes } from 'sequelize';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Resolve paths ──────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_PATH = path.resolve(__dirname, 'backfill-duplicate-report.json');

// ── Parse CLI flags ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const FLAG_CONFIRM = args.includes('--confirm');
const FLAG_FORCE_OVER_20 = args.includes('--force-over-20');

// ── Banner ─────────────────────────────────────────────────────────────────────
console.log('');
console.log('='.repeat(72));
console.log('  backfill-video-catalog.mjs');
console.log('  Migrates exercise_videos -> video_catalog');
console.log(`  Mode: ${FLAG_CONFIRM ? 'CONFIRM (will write)' : 'DRY-RUN (read-only)'}`);
console.log(`  Force >20 dupes: ${FLAG_FORCE_OVER_20 ? 'YES' : 'NO'}`);
console.log('='.repeat(72));
console.log('');

// ── Database connection ────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
  pool: { max: 3, min: 0, acquire: 30000, idle: 10000 },
});

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Slugify a title string into a URL-safe slug.
 * Lowercases, replaces non-alphanumeric chars with hyphens, trims, and collapses.
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 280); // leave room for collision suffix within 300 char limit
}

/**
 * Generate a unique slug with collision retry.
 * Tries base slug, then -2, -3, -4, then falls back to -<timestamp>.
 *
 * @param {string} baseSlug  - The slugified title
 * @param {Set<string>} usedSlugs - Set of slugs already allocated in this run
 * @returns {string} A unique slug
 */
function uniqueSlug(baseSlug, usedSlugs) {
  if (!usedSlugs.has(baseSlug)) {
    usedSlugs.add(baseSlug);
    return baseSlug;
  }
  for (const suffix of ['-2', '-3', '-4']) {
    const candidate = `${baseSlug}${suffix}`;
    if (!usedSlugs.has(candidate)) {
      usedSlugs.add(candidate);
      return candidate;
    }
  }
  // Timestamp fallback — guaranteed unique
  const ts = `${baseSlug}-${Date.now()}`;
  usedSlugs.add(ts);
  return ts;
}

/**
 * Extract a YouTube video ID from the `video_id` field.
 * The field may contain a bare 11-char ID, a full URL, or an embed URL.
 * Returns the extracted ID string or the original value if no pattern matches.
 */
function extractYouTubeVideoId(videoIdField) {
  if (!videoIdField) return null;
  const str = videoIdField.trim();

  // Standard YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) return match[1];
  }

  // If it looks like a bare YouTube ID (11 chars, valid charset), use as-is
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  // Fallback: return the whole string (will still be stored)
  return str;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Connect
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');
  } catch (err) {
    console.error('ERROR: Cannot connect to database:', err.message);
    process.exit(1);
  }

  // 2. Verify both tables exist
  const [tables] = await sequelize.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    { raw: true }
  );

  const tableNames = tables.map(t => t.tablename);

  if (!tableNames.includes('exercise_videos')) {
    console.error('ERROR: exercise_videos table does not exist. Nothing to migrate.');
    process.exit(1);
  }
  if (!tableNames.includes('video_catalog')) {
    console.error('ERROR: video_catalog table does not exist. Run the Phase 1 migration first.');
    process.exit(1);
  }

  // 3. Check if video_catalog already has data (safety guard)
  const [catalogCount] = await sequelize.query(
    'SELECT COUNT(*)::int AS cnt FROM video_catalog',
    { type: QueryTypes.SELECT }
  );
  if (catalogCount.cnt > 0) {
    console.warn(`WARNING: video_catalog already contains ${catalogCount.cnt} rows.`);
    console.warn('         This script is designed for initial migration only.');
    console.warn('         Re-running may create duplicates. Aborting.');
    process.exit(1);
  }

  // 4. Fetch all exercise_videos rows
  const sourceRows = await sequelize.query(
    `SELECT id, exercise_id, video_type, video_id, title, description,
            duration_seconds, thumbnail_url, uploader_id, approved,
            is_public, views, tags, chapters,
            "deletedAt", created_at, updated_at
     FROM exercise_videos
     WHERE "deletedAt" IS NULL
     ORDER BY id ASC`,
    { type: QueryTypes.SELECT }
  );

  console.log(`Found ${sourceRows.length} rows in exercise_videos.`);

  if (sourceRows.length === 0) {
    console.log('No rows to migrate. Exiting.');
    await sequelize.close();
    process.exit(0);
  }

  // 5. Separate YouTube vs Upload rows
  const youtubeRows = sourceRows.filter(r => r.video_type === 'youtube');
  const uploadRows = sourceRows.filter(r => r.video_type === 'upload');
  const otherRows = sourceRows.filter(r => r.video_type !== 'youtube' && r.video_type !== 'upload');

  console.log(`  YouTube: ${youtubeRows.length}`);
  console.log(`  Upload:  ${uploadRows.length}`);
  if (otherRows.length > 0) {
    console.log(`  Other (unexpected video_type): ${otherRows.length}`);
    console.log(`  WARNING: Rows with unexpected video_type will be skipped.`);
  }

  // 6. Dedup YouTube rows by youtube_video_id
  //    Group by extracted youtube_video_id, pick lowest id as canonical
  const youtubeGroups = new Map(); // youtube_video_id -> [row, row, ...]
  for (const row of youtubeRows) {
    const ytId = extractYouTubeVideoId(row.video_id);
    if (!youtubeGroups.has(ytId)) {
      youtubeGroups.set(ytId, []);
    }
    youtubeGroups.get(ytId).push(row);
  }

  // Count groups with duplicates
  const dupGroups = [];
  for (const [ytId, rows] of youtubeGroups) {
    if (rows.length > 1) {
      dupGroups.push({ youtube_video_id: ytId, count: rows.length, rows });
    }
  }

  console.log(`\nYouTube dedup analysis:`);
  console.log(`  Unique youtube_video_ids: ${youtubeGroups.size}`);
  console.log(`  Groups with duplicates:   ${dupGroups.length}`);

  if (dupGroups.length > 0) {
    const totalDuplicateRows = dupGroups.reduce((sum, g) => sum + g.count - 1, 0);
    console.log(`  Total duplicate rows to skip: ${totalDuplicateRows}`);
  }

  // 7. Hard abort if >20 duplicate groups without --force-over-20
  if (dupGroups.length > 20 && !FLAG_FORCE_OVER_20) {
    console.error('');
    console.error('HARD ABORT: More than 20 duplicate YouTube video_id groups detected.');
    console.error(`Found ${dupGroups.length} groups. This exceeds the safety threshold.`);
    console.error('');
    console.error('This may indicate a data quality problem that should be investigated.');
    console.error('To proceed anyway, re-run with: --force-over-20');
    console.error('');

    // Still write the report for inspection
    writeDuplicateReport(dupGroups, []);
    await sequelize.close();
    process.exit(1);
  }

  // 8. Build canonical YouTube set and duplicate report
  const canonicalYoutubeRows = [];
  const duplicateReport = [];

  for (const [ytId, rows] of youtubeGroups) {
    // Sort by id ascending (UUID string sort is deterministic)
    rows.sort((a, b) => a.id.localeCompare(b.id));

    const canonical = rows[0];
    canonicalYoutubeRows.push(canonical);

    if (rows.length > 1) {
      const skipped = rows.slice(1);
      duplicateReport.push({
        youtube_video_id: ytId,
        canonical_id: canonical.id,
        canonical_exercise_id: canonical.exercise_id,
        canonical_title: canonical.title,
        skipped_rows: skipped.map(r => ({
          id: r.id,
          exercise_id: r.exercise_id,
          title: r.title,
          uploader_id: r.uploader_id,
          created_at: r.created_at,
        })),
      });
    }
  }

  // 9. Transform rows
  const usedSlugs = new Set();
  const transformedRows = [];
  const transformErrors = [];

  // Transform canonical YouTube rows
  for (const row of canonicalYoutubeRows) {
    try {
      const transformed = transformYoutubeRow(row, usedSlugs);
      transformedRows.push(transformed);
    } catch (err) {
      transformErrors.push({ row_id: row.id, type: 'youtube', error: err.message });
    }
  }

  // Transform upload rows (no dedup needed — each is unique)
  for (const row of uploadRows) {
    try {
      const transformed = transformUploadRow(row, usedSlugs);
      transformedRows.push(transformed);
    } catch (err) {
      transformErrors.push({ row_id: row.id, type: 'upload', error: err.message });
    }
  }

  // 10. Print summary
  console.log('');
  console.log('-'.repeat(72));
  console.log('TRANSFORM SUMMARY');
  console.log('-'.repeat(72));
  console.log(`  Source rows:              ${sourceRows.length}`);
  console.log(`  YouTube (canonical):      ${canonicalYoutubeRows.length}`);
  console.log(`  YouTube (duplicates):     ${youtubeRows.length - canonicalYoutubeRows.length}`);
  console.log(`  Upload:                   ${uploadRows.length}`);
  console.log(`  Skipped (other type):     ${otherRows.length}`);
  console.log(`  Transform errors:         ${transformErrors.length}`);
  console.log(`  Rows to insert:           ${transformedRows.length}`);
  console.log('-'.repeat(72));

  if (transformErrors.length > 0) {
    console.log('');
    console.log('TRANSFORM ERRORS:');
    for (const te of transformErrors) {
      console.log(`  [${te.type}] row ${te.row_id}: ${te.error}`);
    }
  }

  // 11. Write duplicate report
  writeDuplicateReport(duplicateReport, transformErrors);

  // 12. If dry-run, stop here
  if (!FLAG_CONFIRM) {
    console.log('');
    console.log('DRY-RUN complete. No database writes were performed.');
    console.log(`Duplicate report written to: ${REPORT_PATH}`);
    console.log('');
    console.log('To perform the actual migration, re-run with: --confirm');
    await sequelize.close();
    process.exit(0);
  }

  // 13. CONFIRM mode — insert into video_catalog in a transaction
  if (transformedRows.length === 0) {
    console.log('No rows to insert. Exiting.');
    await sequelize.close();
    process.exit(0);
  }

  console.log('');
  console.log('CONFIRM mode: Beginning transaction...');

  const transaction = await sequelize.transaction();

  try {
    // Temporarily disable the trust-field guard trigger so we can set legacy_import=true
    // (The trigger blocks UPDATE on legacy_import, but INSERT is fine — no need to disable.)
    // Actually the trigger only fires on UPDATE, not INSERT, so we're safe.

    let insertedCount = 0;

    // Insert in batches of 50 to avoid overly large SQL statements
    const BATCH_SIZE = 50;
    for (let i = 0; i < transformedRows.length; i += BATCH_SIZE) {
      const batch = transformedRows.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(transformedRows.length / BATCH_SIZE);

      // Build a multi-row INSERT using raw SQL for maximum control
      const { sql, binds } = buildInsertSQL(batch);

      await sequelize.query(sql, {
        bind: binds,
        type: QueryTypes.INSERT,
        transaction,
      });

      insertedCount += batch.length;
      console.log(`  Batch ${batchNum}/${totalBatches}: inserted ${batch.length} rows (${insertedCount}/${transformedRows.length} total)`);
    }

    await transaction.commit();
    console.log('');
    console.log('Transaction committed successfully.');
    console.log(`Inserted ${insertedCount} rows into video_catalog.`);
  } catch (err) {
    await transaction.rollback();
    console.error('');
    console.error('TRANSACTION FAILED — rolled back. No rows were inserted.');
    console.error('Error:', err.message);
    if (err.parent) {
      console.error('Detail:', err.parent.message);
    }
    await sequelize.close();
    process.exit(1);
  }

  // 14. Verify
  const [finalCount] = await sequelize.query(
    'SELECT COUNT(*)::int AS cnt FROM video_catalog',
    { type: QueryTypes.SELECT }
  );
  console.log(`Verification: video_catalog now contains ${finalCount.cnt} rows.`);

  console.log('');
  console.log(`Duplicate report written to: ${REPORT_PATH}`);
  console.log('Backfill complete.');

  await sequelize.close();
  process.exit(0);
}

// ── Transform functions ────────────────────────────────────────────────────────

/**
 * Transform a YouTube exercise_videos row into a video_catalog row object.
 *
 * Mapping rules:
 *   source:             'youtube'
 *   youtube_video_id:   extracted from video_id field
 *   status:             approved ? 'published' : 'draft'
 *   visibility:         is_public ? 'public' : 'unlisted'
 *   access_tier:        'free'
 *   slug:               slugify(title) with collision retry
 *   exercise_id:        preserved (UUID)
 *   creator_id:         from uploader_id (INTEGER)
 *   thumbnail_url:      preserved
 *   metadata_completed: true
 *   legacy_import:      false (YouTube rows are fully valid)
 *   view_count:         from views
 *   tags:               preserved
 *   chapters:           preserved
 */
function transformYoutubeRow(row, usedSlugs) {
  const ytId = extractYouTubeVideoId(row.video_id);
  if (!ytId) {
    throw new Error(`Cannot extract YouTube video ID from video_id="${row.video_id}"`);
  }

  if (!row.uploader_id && row.uploader_id !== 0) {
    throw new Error(`uploader_id is NULL — cannot map to creator_id (NOT NULL in video_catalog)`);
  }

  const baseSlug = slugify(row.title || 'untitled');
  const slug = uniqueSlug(baseSlug, usedSlugs);
  const isPublished = row.approved === true;

  return {
    id: crypto.randomUUID(),
    title: (row.title || 'Untitled Video').substring(0, 300),
    slug,
    description: row.description || null,
    source: 'youtube',
    visibility: row.is_public ? 'public' : 'unlisted',
    access_tier: 'free',
    status: isPublished ? 'published' : 'draft',
    youtube_video_id: ytId.substring(0, 20),
    thumbnail_url: row.thumbnail_url || null,
    duration_seconds: row.duration_seconds || null,
    view_count: row.views || 0,
    like_count: 0,
    tags: row.tags || [],
    chapters: row.chapters || [],
    exercise_id: row.exercise_id || null,
    creator_id: row.uploader_id,
    metadata_completed: true,
    legacy_import: false,
    featured: false,
    sort_order: 0,
    published_at: isPublished ? (row.created_at || new Date().toISOString()) : null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Transform an Upload exercise_videos row into a video_catalog row object.
 *
 * Mapping rules:
 *   source:             'upload'
 *   status:             'archived' (files lost on Render)
 *   hosted_key:         NULL
 *   legacy_import:      true (gates CHECK exception for missing trust fields)
 *   description:        '[Legacy] Original file lost during Render migration. Re-upload needed.'
 *   visibility:         is_public ? 'public' : 'unlisted'
 *   access_tier:        'free'
 *   slug:               slugify(title) with collision retry
 *   exercise_id:        preserved
 *   creator_id:         from uploader_id
 *   metadata_completed: true
 */
function transformUploadRow(row, usedSlugs) {
  if (!row.uploader_id && row.uploader_id !== 0) {
    throw new Error(`uploader_id is NULL — cannot map to creator_id (NOT NULL in video_catalog)`);
  }

  const baseSlug = slugify(row.title || 'untitled');
  const slug = uniqueSlug(baseSlug, usedSlugs);

  return {
    id: crypto.randomUUID(),
    title: (row.title || 'Untitled Video').substring(0, 300),
    slug,
    description: row.description
      ? `${row.description}\n\n[Legacy] Original file lost during Render migration. Re-upload needed.`
      : '[Legacy] Original file lost during Render migration. Re-upload needed.',
    source: 'upload',
    visibility: row.is_public ? 'public' : 'unlisted',
    access_tier: 'free',
    status: 'archived',
    hosted_key: null,
    thumbnail_url: row.thumbnail_url || null,
    duration_seconds: row.duration_seconds || null,
    view_count: row.views || 0,
    like_count: 0,
    tags: row.tags || [],
    chapters: row.chapters || [],
    exercise_id: row.exercise_id || null,
    creator_id: row.uploader_id,
    metadata_completed: true,
    legacy_import: true,
    featured: false,
    sort_order: 0,
    published_at: null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

// ── SQL builder ────────────────────────────────────────────────────────────────

/**
 * Build a parameterized multi-row INSERT statement for a batch of transformed rows.
 *
 * @param {Array<Object>} rows - Array of transformed row objects
 * @returns {{ sql: string, binds: Array }} Parameterized SQL + bind values
 */
function buildInsertSQL(rows) {
  const columns = [
    'id', 'title', 'slug', 'description', 'source', 'visibility', 'access_tier',
    'status', 'youtube_video_id', 'hosted_key', 'thumbnail_url', 'duration_seconds',
    'view_count', 'like_count', 'tags', 'chapters', 'exercise_id', 'creator_id',
    'metadata_completed', 'legacy_import', 'featured', 'sort_order', 'published_at',
    'created_at', 'updated_at',
  ];

  const binds = [];
  const valueClauses = [];

  for (const row of rows) {
    const placeholders = [];
    for (const col of columns) {
      binds.push(row[col] !== undefined ? row[col] : null);
      const idx = binds.length;

      // Cast JSONB columns and ENUM columns appropriately
      if (col === 'tags' || col === 'chapters') {
        placeholders.push(`$${idx}::jsonb`);
      } else if (col === 'source') {
        placeholders.push(`$${idx}::enum_video_catalog_source`);
      } else if (col === 'visibility') {
        placeholders.push(`$${idx}::enum_video_catalog_visibility`);
      } else if (col === 'access_tier') {
        placeholders.push(`$${idx}::enum_video_catalog_access_tier`);
      } else if (col === 'status') {
        placeholders.push(`$${idx}::enum_video_catalog_status`);
      } else {
        placeholders.push(`$${idx}`);
      }
    }
    valueClauses.push(`(${placeholders.join(', ')})`);
  }

  // Quote column names to handle reserved words
  const quotedColumns = columns.map(c => `"${c}"`).join(', ');

  const sql = `INSERT INTO video_catalog (${quotedColumns})\nVALUES\n${valueClauses.join(',\n')}`;

  // Serialize JSONB values to strings for the driver
  const processedBinds = binds.map((val, i) => {
    // Find which column this bind belongs to
    const colIndex = i % columns.length;
    const col = columns[colIndex];
    if ((col === 'tags' || col === 'chapters') && val !== null && typeof val !== 'string') {
      return JSON.stringify(val);
    }
    return val;
  });

  return { sql, binds: processedBinds };
}

// ── Report writer ──────────────────────────────────────────────────────────────

/**
 * Write the duplicate report and any transform errors to a JSON file.
 */
function writeDuplicateReport(duplicateReport, transformErrors) {
  const report = {
    generated_at: new Date().toISOString(),
    mode: FLAG_CONFIRM ? 'confirm' : 'dry-run',
    summary: {
      duplicate_youtube_groups: duplicateReport.length,
      total_skipped_duplicates: duplicateReport.reduce(
        (sum, g) => sum + g.skipped_rows.length, 0
      ),
      transform_errors: transformErrors.length,
    },
    duplicate_groups: duplicateReport,
    transform_errors: transformErrors,
  };

  try {
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`Duplicate report written to: ${REPORT_PATH}`);
  } catch (err) {
    console.error(`WARNING: Failed to write duplicate report: ${err.message}`);
    // Non-fatal — print to stdout as fallback
    console.log('--- DUPLICATE REPORT (stdout fallback) ---');
    console.log(JSON.stringify(report, null, 2));
    console.log('--- END REPORT ---');
  }
}

// ── Run ────────────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
