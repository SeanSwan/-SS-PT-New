/**
 * Phase 3 Slice 3.5 — clips routes + middleware locks
 * =====================================================
 * Source-text locks for the upload/list/delete endpoints + auth + flag
 * middleware. Live HTTP-level integration is in slice 3.7+ once the merge
 * endpoint exists; this slice locks the design choices.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTES_SRC = readFileSync(
  resolve(__dirname, '../../routes/plaud/plaudClipsRoutes.mjs'), 'utf8',
);
const UPLOAD_SRC = readFileSync(
  resolve(__dirname, '../../controllers/plaud/plaudUploadController.mjs'), 'utf8',
);
const LIST_SRC = readFileSync(
  resolve(__dirname, '../../controllers/plaud/plaudListController.mjs'), 'utf8',
);
const FLAG_SRC = readFileSync(
  resolve(__dirname, '../../middleware/plaudFeatureFlag.mjs'), 'utf8',
);
const AUTHZ_SRC = readFileSync(
  resolve(__dirname, '../../middleware/plaudAuthz.mjs'), 'utf8',
);
const CORE_ROUTES = readFileSync(
  resolve(__dirname, '../../core/routes.mjs'), 'utf8',
);

describe('Slice 3.5 — plaudFeatureFlag middleware', () => {
  it('returns 503 with structured PLAUD_DISABLED when flag != "true"', () => {
    expect(FLAG_SRC).toMatch(/process\.env\.PLAUD_MERGE_ENABLED\s*!==\s*['"]true['"]/);
    expect(FLAG_SRC).toMatch(/status\(503\)/);
    expect(FLAG_SRC).toMatch(/code:\s*['"]PLAUD_DISABLED['"]/);
  });

  it('exports default + named', () => {
    expect(FLAG_SRC).toMatch(/export\s+function\s+plaudFeatureFlag/);
    expect(FLAG_SRC).toMatch(/export\s+default\s+plaudFeatureFlag/);
  });
});

describe('Slice 3.5 — plaudAuthz middleware', () => {
  it('exports PlaudAuthzError with status code', () => {
    expect(AUTHZ_SRC).toMatch(/export\s+class\s+PlaudAuthzError\s+extends\s+Error/);
  });

  it('assertClipOwnership bypasses for admin role', () => {
    expect(AUTHZ_SRC).toMatch(/role\s*===\s*['"]admin['"]/);
  });

  it('assertTrainerAssignedToClient queries client_trainer_assignments + status=active', () => {
    expect(AUTHZ_SRC).toMatch(/FROM\s+client_trainer_assignments/);
    expect(AUTHZ_SRC).toMatch(/status\s*=\s*['"]active['"]/);
  });

  it('uses camelCase column quotes ("trainerId", "clientId") per schema preflight', () => {
    expect(AUTHZ_SRC).toMatch(/"trainerId"/);
    expect(AUTHZ_SRC).toMatch(/"clientId"/);
  });

  it('admin role bypasses trainer-client assignment check', () => {
    expect(AUTHZ_SRC).toMatch(/role\s*===\s*['"]admin['"][\s\S]{0,80}return\s+true/);
  });

  it('throws NOT_ASSIGNED_TO_CLIENT on no row', () => {
    expect(AUTHZ_SRC).toMatch(/NOT_ASSIGNED_TO_CLIENT/);
  });
});

describe('Slice 3.5 — plaudUploadController', () => {
  it('two-phase upload: phase A inserts uploading, phase B writes disk, phase C transactionally flips to pending_merge + inserts mirror_job', () => {
    expect(UPLOAD_SRC).toMatch(/Phase A:\s*insert plaud_clips row with status='uploading'/);
    expect(UPLOAD_SRC).toMatch(/Phase B:\s*write to PLAUD disk path/);
    expect(UPLOAD_SRC).toMatch(/Phase C:\s*transactionally flip status='pending_merge' \+ insert mirror_job/);
  });

  it('rejects clips that fail silent detection (CLIP_TOO_SILENT)', () => {
    expect(UPLOAD_SRC).toMatch(/CLIP_TOO_SILENT/);
  });

  it('rejects clips that fail ffprobe (CLIP_CORRUPT)', () => {
    expect(UPLOAD_SRC).toMatch(/code:\s*['"]CLIP_CORRUPT['"]/);
  });

  it('codec allowlist enforced (mp3/aac/opus/pcm_s16le/flac/vorbis)', () => {
    expect(UPLOAD_SRC).toMatch(/ALLOWED_CODECS\s*=\s*new\s+Set\(\[/);
    for (const codec of ['mp3', 'aac', 'opus', 'pcm_s16le', 'flac', 'vorbis']) {
      expect(UPLOAD_SRC).toMatch(new RegExp(`'${codec}'`));
    }
  });

  it('on disk-write failure: marks row lost and returns INTERNAL_ERROR for that file', () => {
    expect(UPLOAD_SRC).toMatch(/UPDATE\s+plaud_clips\s+SET\s+status\s*=\s*'lost'/);
  });

  it('phase-C uses transaction with rollback on error', () => {
    expect(UPLOAD_SRC).toMatch(/sequelize\.transaction\(\)/);
    expect(UPLOAD_SRC).toMatch(/transaction\.rollback/);
  });

  it('mime → ext mapping covers PLAUD-native containers', () => {
    expect(UPLOAD_SRC).toMatch(/'audio\/mpeg':\s*'mp3'/);
    expect(UPLOAD_SRC).toMatch(/'audio\/x-m4a':\s*'m4a'/);
    expect(UPLOAD_SRC).toMatch(/'audio\/wav':\s*'wav'/);
  });

  it('per-file size cap from PLAUD_MAX_FILE_BYTES env (default 20MB)', () => {
    expect(UPLOAD_SRC).toMatch(/PLAUD_MAX_FILE_BYTES/);
    expect(UPLOAD_SRC).toMatch(/20\s*\*\s*1024\s*\*\s*1024/);
  });

  it('returns stable user-safe rejection messages without raw probe or disk errors', () => {
    expect(UPLOAD_SRC).toMatch(/safeUploadRejectionMessage/);
    expect(UPLOAD_SRC).not.toMatch(/message:\s*err\.message/);
    expect(UPLOAD_SRC).not.toMatch(/message:\s*`mime\s+\$\{file\.mimetype\}`/);
    expect(UPLOAD_SRC).not.toMatch(/message:\s*`disk write failed:\s*\$\{err\.message\}`/);
    expect(UPLOAD_SRC).not.toMatch(/message:\s*`phase-C failed:\s*\$\{err\.message\}`/);
    expect(UPLOAD_SRC).not.toMatch(/message:\s*`mean=\$\{silenceCheck\.meanDb\}dB max=\$\{silenceCheck\.maxDb\}dB`/);
  });
});

describe('Slice 3.5 — plaudListController', () => {
  it('list excludes deleted/expired/lost statuses', () => {
    expect(LIST_SRC).toMatch(/status\s+NOT\s+IN\s*\(\s*'deleted'\s*,\s*'expired'\s*,\s*'lost'\s*\)/);
  });

  it('cursor pagination uses (uploaded_at, clip_id) tuple comparison', () => {
    expect(LIST_SRC).toMatch(/\(uploaded_at,\s*clip_id\)\s*<\s*\(:cursorUploadedAt,\s*:cursorClipId\)/);
  });

  it('cursor decoder rejects malformed UUIDs (path-traversal-via-cursor guard, canonical via PLAUD_UUID_REGEX)', () => {
    expect(LIST_SRC).toMatch(/PLAUD_UUID_REGEX\.test/);
  });

  it('limit clamped to MAX_LIMIT (100) and minimum 1', () => {
    expect(LIST_SRC).toMatch(/MAX_LIMIT\s*=\s*100/);
    expect(LIST_SRC).toMatch(/Math\.min\(\s*MAX_LIMIT/);
  });

  it('hasMore detected by fetching limit+1 and returning limit', () => {
    expect(LIST_SRC).toMatch(/limit\s*\+\s*1/);
  });

  it('delete is soft-delete: status=deleted + deleted_at=NOW(), filtered by user_id', () => {
    expect(LIST_SRC).toMatch(/SET\s+status\s*=\s*'deleted',[\s\S]{0,200}deleted_at\s*=\s*NOW\(\)/);
    expect(LIST_SRC).toMatch(/WHERE\s+clip_id\s*=\s*:clipId[\s\S]{0,200}user_id\s*=\s*:userId/);
  });

  it('delete returns 404 when row not found or already deleted', () => {
    expect(LIST_SRC).toMatch(/CLIP_NOT_FOUND/);
    expect(LIST_SRC).toMatch(/already deleted/);
  });

  it('delete invokes best-effort deleteClip from storage layer', () => {
    expect(LIST_SRC).toMatch(/deleteClip\(/);
  });

  it('audio playback handler validates ownership and reads bytes through storage service', () => {
    expect(LIST_SRC).toMatch(/export\s+async\s+function\s+audioHandler/);
    expect(LIST_SRC).toMatch(/PLAUD_UUID_REGEX\.test\(clipId\)/);
    expect(LIST_SRC).toMatch(/WHERE\s+clip_id\s*=\s*:clipId[\s\S]{0,240}user_id\s*=\s*:userId/);
    expect(LIST_SRC).toMatch(/r2_mirror_status/);
    expect(LIST_SRC).toMatch(/readClip\(\s*userId,\s*row\.clip_id,\s*row\.storage_ext/);
    expect(LIST_SRC).toMatch(/fallbackR2Key:\s*row\.r2_key/);
    expect(LIST_SRC).toMatch(/skipR2Fallback:\s*!row\.r2_key\s*&&\s*row\.r2_mirror_status\s*!==\s*'mirrored'/);
  });

  it('audio playback handler returns private audio response headers and no raw filename', () => {
    expect(LIST_SRC).toMatch(/Content-Type/);
    expect(LIST_SRC).toMatch(/Cache-Control[\s\S]{0,80}private,\s*no-store/);
    expect(LIST_SRC).toMatch(/X-Content-Type-Options[\s\S]{0,80}nosniff/);
    expect(LIST_SRC).toMatch(/Content-Disposition[\s\S]{0,140}plaud-clip-\$\{row\.clip_id\}/);
    expect(LIST_SRC).toMatch(/CLIP_NOT_READY/);
    expect(LIST_SRC).toMatch(/UNSUPPORTED_AUDIO_TYPE/);
    expect(LIST_SRC).toMatch(/CLIP_AUDIO_NOT_FOUND/);
  });

  it('list response marks which clips have a playback endpoint ready', () => {
    expect(LIST_SRC).toMatch(/function\s+isAudioLoadAvailable/);
    expect(LIST_SRC).toMatch(/r2_mirror_status\s*!==\s*'failed_terminal'/);
    expect(LIST_SRC).toMatch(/playbackReady:\s*isAudioLoadAvailable\(r\)/);
    expect(LIST_SRC).toMatch(/playbackPath:\s*playbackPathFor\(r\.clip_id\)/);
  });
});

describe('Slice 3.5 — plaudClipsRoutes mounting', () => {
  it('plaudFeatureFlag is FIRST middleware (router.use before protect/authorize)', () => {
    const flagIdx = ROUTES_SRC.indexOf('router.use(plaudFeatureFlag)');
    const protectIdx = ROUTES_SRC.indexOf('router.use(protect)');
    expect(flagIdx).toBeGreaterThan(0);
    expect(protectIdx).toBeGreaterThan(flagIdx);
  });

  it('protect + authorize(["admin","trainer"]) gates downstream routes', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(protect\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(authorize\(\['admin',\s*'trainer'\]\)\)/);
  });

  it('multer is memoryStorage (controller stages to tmp before ffprobe)', () => {
    expect(ROUTES_SRC).toMatch(/multer\.memoryStorage/);
  });

  it('multer fileFilter has audio mime allowlist', () => {
    expect(ROUTES_SRC).toMatch(/audio\/mpeg/);
    expect(ROUTES_SRC).toMatch(/audio\/wav/);
    expect(ROUTES_SRC).toMatch(/audio\/x-m4a/);
  });

  it('rate limiter counts per FILE not per request (Codex Round 2 MEDIUM #5)', () => {
    expect(ROUTES_SRC).toMatch(/timestamps\.length\s*\+\s*incoming/);
  });

  it('multer error handler maps LIMIT_FILE_SIZE → 413 UPLOAD_TOO_LARGE', () => {
    expect(ROUTES_SRC).toMatch(/LIMIT_FILE_SIZE/);
    expect(ROUTES_SRC).toMatch(/UPLOAD_TOO_LARGE/);
  });

  it('multer error handler maps LIMIT_FILE_COUNT → 400 TOO_MANY_FILES', () => {
    expect(ROUTES_SRC).toMatch(/LIMIT_FILE_COUNT/);
    expect(ROUTES_SRC).toMatch(/TOO_MANY_FILES/);
  });

  it('mime filter rejection → 415 UNSUPPORTED_AUDIO_TYPE', () => {
    expect(ROUTES_SRC).toMatch(/UNSUPPORTED_AUDIO_TYPE/);
  });

  it('maps multer upload failures to stable user-safe messages', () => {
    expect(ROUTES_SRC).toMatch(/safeUploadErrorMessage/);
    expect(ROUTES_SRC).not.toMatch(/message:\s*err\.message/);
  });

  it('plaud authz error handler is registered after route handlers', () => {
    expect(ROUTES_SRC).toMatch(/handlePlaudAuthzError/);
  });

  it('registers protected GET /:clipId/audio before the authz error handler', () => {
    const audioRouteIdx = ROUTES_SRC.indexOf("router.get('/:clipId/audio', audioHandler)");
    const authzIdx = ROUTES_SRC.indexOf('router.use(handlePlaudAuthzError)');
    expect(audioRouteIdx).toBeGreaterThan(0);
    expect(authzIdx).toBeGreaterThan(audioRouteIdx);
  });

  it('mounted at /api/plaud/clips in core/routes.mjs', () => {
    expect(CORE_ROUTES).toMatch(/import\s+plaudClipsRoutes\s+from\s+['"]\.\.\/routes\/plaud\/plaudClipsRoutes\.mjs['"]/);
    expect(CORE_ROUTES).toMatch(/app\.use\(\s*['"]\/api\/plaud\/clips['"]\s*,\s*plaudClipsRoutes\s*\)/);
  });
});
