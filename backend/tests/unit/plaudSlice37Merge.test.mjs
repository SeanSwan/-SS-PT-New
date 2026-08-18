/**
 * Phase 3 Slice 3.7 — merge endpoint + boundary detector + vocab locks
 * ======================================================================
 * Source-text + behavioral locks for the merge orchestration. Boundary
 * detector is fully behavioral (no DB needed). Merge endpoint locked at
 * source level — full integration test runs in slice 3.14 Playwright.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BOUNDARY_SRC = readFileSync(
  resolve(__dirname, '../../services/clientNameBoundaryDetector.mjs'), 'utf8',
);
const VOCAB_DATA = readFileSync(
  resolve(__dirname, '../../services/plaud-data/plaud-fitness-vocab.json'), 'utf8',
);
const MERGE_CTRL_SRC = readFileSync(
  resolve(__dirname, '../../controllers/plaud/plaudMergeController.mjs'), 'utf8',
);
const REQUESTS_CTRL_SRC = readFileSync(
  resolve(__dirname, '../../controllers/plaud/plaudMergeRequestsController.mjs'), 'utf8',
);
const SEGMENTS_CTRL_SRC = readFileSync(
  resolve(__dirname, '../../controllers/plaud/plaudMergeSegmentsController.mjs'), 'utf8',
);
const ROUTES_SRC = readFileSync(
  resolve(__dirname, '../../routes/plaud/plaudMergeRoutes.mjs'), 'utf8',
);
const CORE_ROUTES = readFileSync(
  resolve(__dirname, '../../core/routes.mjs'), 'utf8',
);

describe('Slice 3.7 — clientNameBoundaryDetector source contract', () => {
  it('confidence is low or medium only (NOT high — Codex Round 2 HIGH #7)', () => {
    expect(BOUNDARY_SRC).toMatch(/confidence\s*=\s*['"]low['"]/);
    expect(BOUNDARY_SRC).toMatch(/confidence\s*=\s*['"]medium['"]/);
    // Lock against accidental reintroduction of segment-aware 'high' confidence
    expect(BOUNDARY_SRC).not.toMatch(/confidence\s*=\s*['"]high['"]/);
  });

  it('Levenshtein fuzzy match disabled for names <5 chars (Codex Round 1 MEDIUM)', () => {
    expect(BOUNDARY_SRC).toMatch(/MIN_FUZZY_LEN\s*=\s*5/);
  });

  it('common-word stopword list rejects "like"/"bike"/"hike" etc.', () => {
    expect(BOUNDARY_SRC).toMatch(/COMMON_WORDS_STOPLIST/);
    for (const w of ['like', 'bike', 'hike']) {
      expect(BOUNDARY_SRC).toMatch(new RegExp(`'${w}'`));
    }
  });
});

describe('Slice 3.7 — clientNameBoundaryDetector behavior', () => {
  it('detectBoundary flags warning when 2 distinct clients mentioned', async () => {
    const { detectBoundary } = await import('../../services/clientNameBoundaryDetector.mjs');
    const roster = [
      { id: 1, firstName: 'Sarah', lastName: 'Johnson' },
      { id: 2, firstName: 'Michael', lastName: 'Stevens' },
    ];
    const transcript = 'Today is May 3rd. Sarah Johnson is doing squats. Then Michael Stevens has bench press.';
    const result = detectBoundary({ transcript, roster });
    expect(result.warning).toBe(true);
    expect(result.confidence).toBe('medium');
    expect(result.detectedNames.length).toBe(2);
  });

  it('does NOT flag warning when only 1 client matches', async () => {
    const { detectBoundary } = await import('../../services/clientNameBoundaryDetector.mjs');
    const roster = [
      { id: 1, firstName: 'Sarah', lastName: 'Johnson' },
      { id: 2, firstName: 'Michael', lastName: 'Stevens' },
    ];
    const transcript = 'Sarah Johnson today. Squats and deadlifts.';
    const result = detectBoundary({ transcript, roster });
    expect(result.warning).toBe(false);
    expect(result.confidence).toBe('low');
    expect(result.detectedNames.length).toBe(1);
  });

  it('does NOT match short names against common words ("Mike" vs "like")', async () => {
    const { detectBoundary } = await import('../../services/clientNameBoundaryDetector.mjs');
    const roster = [{ id: 1, firstName: 'Mike', lastName: 'Smith' }];
    const transcript = 'I would like to do squats. Bike-style intervals next.';
    const result = detectBoundary({ transcript, roster });
    expect(result.warning).toBe(false);
    expect(result.detectedNames.length).toBe(0);
  });

  it('matches 1-char-typo last name (Levenshtein 1) when length >= 5', async () => {
    const { detectBoundary } = await import('../../services/clientNameBoundaryDetector.mjs');
    const roster = [{ id: 1, firstName: 'Sarah', lastName: 'Johnson' }];
    const transcript = 'Sarah Johnsen is squatting.';  // 1 char swap
    const result = detectBoundary({ transcript, roster });
    expect(result.detectedNames.length).toBeGreaterThan(0);
  });

  it('returns empty when transcript missing or roster empty', async () => {
    const { detectBoundary } = await import('../../services/clientNameBoundaryDetector.mjs');
    expect(detectBoundary({ transcript: '', roster: [] }).detectedNames).toEqual([]);
    expect(detectBoundary({ transcript: 'anything', roster: [] }).detectedNames).toEqual([]);
  });
});

describe('Slice 3.7 — fitnessTranscriptionVocabService', () => {
  it('vocab JSON has version + categories', () => {
    const parsed = JSON.parse(VOCAB_DATA);
    expect(parsed.version).toBeGreaterThan(0);
    expect(parsed.categories).toBeTypeOf('object');
    expect(parsed.categories.exercises.length).toBeGreaterThan(20);
    expect(parsed.categories.anatomy.length).toBeGreaterThan(20);
  });

  it('flattens + dedupes terms across categories', async () => {
    const { getFitnessVocabFlat } = await import('../../services/fitnessTranscriptionVocabService.mjs');
    const flat = getFitnessVocabFlat();
    expect(flat.length).toBeGreaterThan(100);
    expect(new Set(flat).size).toBe(flat.length);
    expect(flat.every((t) => typeof t === 'string' && t.length > 0)).toBe(true);
  });

  it('bias prompt includes representative NASM CES + exercise terms', async () => {
    const { getFitnessVocabBiasPrompt } = await import('../../services/fitnessTranscriptionVocabService.mjs');
    const prompt = getFitnessVocabBiasPrompt();
    expect(prompt).toMatch(/squat/);
    expect(prompt).toMatch(/inhibit/i);
    expect(prompt).toMatch(/scapula/);
  });
});

describe('Slice 3.7 — plaudMergeController source contract', () => {
  it('clipIds cardinality 1-5 enforced for single-workout passthrough', () => {
    expect(MERGE_CTRL_SRC).toMatch(/clipIds\.length\s*<\s*1/);
    expect(MERGE_CTRL_SRC).toMatch(/TOO_FEW_CLIPS/);
    expect(MERGE_CTRL_SRC).toMatch(/clipIds\.length\s*>\s*5/);
  });

  it('trainer-client assignment authz check (Codex Round 1 gap #10)', () => {
    expect(MERGE_CTRL_SRC).toMatch(/assertTrainerAssignedToClient/);
  });

  it('processing row inserted BEFORE ffmpeg starts (Codex Round 2 HIGH #1 failsafe)', () => {
    expect(MERGE_CTRL_SRC).toMatch(/INSERT INTO plaud_merge_requests[\s\S]{0,300}'processing'/);
  });

  it('atomic finalization wraps fence + complete + clip update + lock release in one transaction (Codex Round 4 HIGH)', () => {
    expect(MERGE_CTRL_SRC).toMatch(/sequelize\.transaction\(\)/);
    expect(MERGE_CTRL_SRC).toMatch(/verifyHolder\(\s*\{[^}]*transaction/);
    expect(MERGE_CTRL_SRC).toMatch(/UPDATE\s+plaud_merge_requests[\s\S]{0,300}status\s*=\s*'completed'/);
    expect(MERGE_CTRL_SRC).toMatch(/UPDATE\s+plaud_clips[\s\S]{0,200}status\s*=\s*'merged'/);
    expect(MERGE_CTRL_SRC).toMatch(/DELETE\s+FROM\s+plaud_merge_locks/);
  });

  it('clip update WHERE guards status=pending_merge AND deleted_at IS NULL (Codex Round 4 MED #4)', () => {
    expect(MERGE_CTRL_SRC).toMatch(/status\s*=\s*'pending_merge'/);
    expect(MERGE_CTRL_SRC).toMatch(/deleted_at\s+IS\s+NULL/);
  });

  it('clip update row count must equal effective merge clip count else rollback', () => {
    expect(MERGE_CTRL_SRC).toMatch(/updatedCount\s*!==\s*clipIdsForMerge\.length/);
    expect(MERGE_CTRL_SRC).toMatch(/transaction\.rollback/);
  });

  it('lock fence failure → MERGE_LOCK_LOST (Codex Round 4 HIGH)', () => {
    expect(MERGE_CTRL_SRC).toMatch(/MERGE_LOCK_LOST/);
  });

  it('merged audio cap 20MB else MERGED_AUDIO_TOO_LARGE', () => {
    expect(MERGE_CTRL_SRC).toMatch(/MERGED_AUDIO_TOO_LARGE/);
    expect(MERGE_CTRL_SRC).toMatch(/MAX_MERGED_BYTES/);
  });

  it('failure modes flip merge_request to status=failed with error_code', () => {
    expect(MERGE_CTRL_SRC).toMatch(/markMergeFailed/);
    for (const code of ['CLIP_NOT_FOUND', 'TRANSCRIPTION_FAILED', 'PARSE_FAILED', 'INTERNAL_ERROR']) {
      expect(MERGE_CTRL_SRC).toMatch(new RegExp(code));
    }
  });

  it('heartbeat keeps lock alive during long external calls (Codex Round 1 HIGH #2)', () => {
    expect(MERGE_CTRL_SRC).toMatch(/heartbeat\(/);
    expect(MERGE_CTRL_SRC).toMatch(/HEARTBEAT_INTERVAL_MS/);
    expect(MERGE_CTRL_SRC).toMatch(/clearInterval/);
  });

  it('roster query uses "Users" PascalCase + camelCase columns', () => {
    expect(MERGE_CTRL_SRC).toMatch(/FROM\s+"Users"/);
    expect(MERGE_CTRL_SRC).toMatch(/u\."firstName"/);
    expect(MERGE_CTRL_SRC).toMatch(/u\."lastName"/);
  });

  it('ARRAY_POSITION preserves trainer-selected clip order (Codex Round 1 HIGH #1)', () => {
    expect(MERGE_CTRL_SRC).toMatch(/array_position/);
  });

  it('supports uploaded_at_asc order mode for time-aware clip puzzles', () => {
    expect(MERGE_CTRL_SRC).toMatch(/uploaded_at_asc/);
    expect(MERGE_CTRL_SRC).toMatch(/COALESCE\(recorded_at, uploaded_at\) ASC/);
  });

  it('persists encrypted clip timeline metadata with the merge payload', () => {
    expect(MERGE_CTRL_SRC).toMatch(/buildClipTimeline/);
    expect(MERGE_CTRL_SRC).toMatch(/encryptPayload\(\{\s*transcript,\s*parsedWorkout,\s*clipTimeline/);
    expect(MERGE_CTRL_SRC).toMatch(/clipTimeline/);
  });

  it('finally block always releases lock + cleans tmp', () => {
    expect(MERGE_CTRL_SRC).toMatch(/finally\s*\{[\s\S]{0,400}releaseLock/);
    expect(MERGE_CTRL_SRC).toMatch(/finally\s*\{[\s\S]{0,400}fs\.unlink/);
  });
});

describe('Slice 3.7 — plaudMergeRequestsController source contract', () => {
  it('list endpoint is METADATA ONLY — does NOT decrypt (Codex Round 2 MEDIUM #5)', () => {
    expect(REQUESTS_CTRL_SRC).toMatch(/listHandler/);
    // List endpoint should NOT call decryptPayload
    const listBlock = REQUESTS_CTRL_SRC.match(/export\s+async\s+function\s+listHandler[\s\S]+?(?=export|$)/);
    expect(listBlock).toBeTruthy();
    expect(listBlock[0]).not.toMatch(/decryptPayload/);
  });

  it('detail endpoint decrypts ONE merge at a time', () => {
    expect(REQUESTS_CTRL_SRC).toMatch(/detailHandler/);
    expect(REQUESTS_CTRL_SRC).toMatch(/decryptPayload/);
  });

  it('detail returns 410 MERGE_CIPHER_PURGED when cipher dropped', () => {
    expect(REQUESTS_CTRL_SRC).toMatch(/MERGE_CIPHER_PURGED/);
    expect(REQUESTS_CTRL_SRC).toMatch(/status\(410\)/);
  });

  it('detail surfaces transcriptHash even when cipher purged (audit trail)', () => {
    expect(REQUESTS_CTRL_SRC).toMatch(/transcriptHash:\s*row\.transcript_hash/);
  });

  it('discard updates status=discarded + purges cipher fields to NULL', () => {
    expect(REQUESTS_CTRL_SRC).toMatch(/status\s*=\s*'discarded'/);
    expect(REQUESTS_CTRL_SRC).toMatch(/payload_cipher\s*=\s*NULL/);
    expect(REQUESTS_CTRL_SRC).toMatch(/cipher_purged_at\s*=\s*NOW\(\)/);
  });

  it('approve updates status=approved + purges cipher fields to NULL', () => {
    expect(REQUESTS_CTRL_SRC).toMatch(/approveHandler/);
    expect(REQUESTS_CTRL_SRC).toMatch(/status\s*=\s*'approved'/);
    expect(REQUESTS_CTRL_SRC).toMatch(/payload_cipher\s*=\s*NULL/);
    expect(REQUESTS_CTRL_SRC).toMatch(/cipher_purged_at\s*=\s*NOW\(\)/);
  });

  it('discard requires user_id match OR admin role', () => {
    expect(REQUESTS_CTRL_SRC).toMatch(/role\s*=\s*'admin'\s+OR\s+user_id\s*=\s*:userId/);
  });

  it('detail handles CipherKeyVersionUnavailable + CipherDecryptFailed distinctly', () => {
    expect(REQUESTS_CTRL_SRC).toMatch(/CIPHER_KEY_VERSION_UNAVAILABLE/);
    expect(REQUESTS_CTRL_SRC).toMatch(/CIPHER_DECRYPT_FAILED/);
  });

  it('detail returns decrypted clip timeline metadata for review', () => {
    expect(REQUESTS_CTRL_SRC).toMatch(/clipTimeline:\s*payload\.clipTimeline\s*\|\|\s*\[\]/);
  });

  it('segment parser decrypts one ready date-split segment without writing logs', () => {
    expect(SEGMENTS_CTRL_SRC).toMatch(/parseSegmentHandler/);
    expect(SEGMENTS_CTRL_SRC).toMatch(/buildPlaudMergeDateSplitCandidates/);
    expect(SEGMENTS_CTRL_SRC).toMatch(/parseWorkoutTranscript/);
    expect(SEGMENTS_CTRL_SRC).toMatch(/SEGMENT_DATE_UNRESOLVED/);
    expect(SEGMENTS_CTRL_SRC).toMatch(/dateOverride/);
    expect(SEGMENTS_CTRL_SRC).toMatch(/INVALID_DATE_OVERRIDE/);
    expect(SEGMENTS_CTRL_SRC).toMatch(/SEGMENT_DATE_IN_FUTURE/);
    expect(SEGMENTS_CTRL_SRC).not.toMatch(/logWorkoutForClient/);
    expect(SEGMENTS_CTRL_SRC).not.toMatch(/status\s*=\s*'approved'/);
  });
});

describe('Slice 3.7 — plaudMergeRoutes mounting', () => {
  it('exports mergeActionRouter for /api/plaud/merge', () => {
    expect(ROUTES_SRC).toMatch(/export\s+const\s+mergeActionRouter/);
    // Asserts mergeHandler is the handler for POST '/', without forbidding
    // middleware in front of it. The original pattern required mergeHandler to
    // sit immediately after the path, which made the mount unextendable: the
    // client AI-consent gate is deliberately mounted ahead of the handler so a
    // client who opted out never reaches transcription.
    expect(ROUTES_SRC).toMatch(/r\.post\(\s*['"]\/['"]\s*,[^)]*\bmergeHandler\b/);
  });

  it('exports mergeRequestsRouter for /api/plaud/merge-requests', () => {
    expect(ROUTES_SRC).toMatch(/export\s+const\s+mergeRequestsRouter/);
    expect(ROUTES_SRC).toMatch(/r\.get\(\s*['"]\/['"]\s*,\s*listMergeRequestsHandler/);
    expect(ROUTES_SRC).toMatch(/r\.get\(\s*['"]\/:mergeRequestId['"]\s*,\s*detailMergeRequestHandler/);
    expect(ROUTES_SRC).toMatch(/r\.post\(\s*['"]\/:mergeRequestId\/segments\/:segmentId\/parse['"]\s*,\s*parseMergeSegmentHandler/);
    expect(ROUTES_SRC).toMatch(/r\.post\(\s*['"]\/:mergeRequestId\/approve['"]\s*,\s*approveMergeRequestHandler/);
    expect(ROUTES_SRC).toMatch(/r\.post\(\s*['"]\/:mergeRequestId\/discard['"]\s*,\s*discardMergeRequestHandler/);
  });

  it('both routers gate on plaudFeatureFlag + protect + authorize', () => {
    const flagCount = (ROUTES_SRC.match(/plaudFeatureFlag/g) || []).length;
    const protectCount = (ROUTES_SRC.match(/r\.use\(protect\)/g) || []).length;
    expect(flagCount).toBeGreaterThanOrEqual(2);
    expect(protectCount).toBeGreaterThanOrEqual(2);
  });

  it('mounted at /api/plaud/merge and /api/plaud/merge-requests in core/routes.mjs', () => {
    expect(CORE_ROUTES).toMatch(/app\.use\(\s*['"]\/api\/plaud\/merge['"]\s*,\s*mergeActionRouter\s*\)/);
    expect(CORE_ROUTES).toMatch(/app\.use\(\s*['"]\/api\/plaud\/merge-requests['"]\s*,\s*mergeRequestsRouter\s*\)/);
  });
});
