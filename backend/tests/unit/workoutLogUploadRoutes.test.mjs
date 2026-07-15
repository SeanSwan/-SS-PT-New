/**
 * workoutLogUploadRoutes — route contract regression locks
 * =========================================================
 * Phase 10.1 follow-up 2026-04-14: the Phase 10 parser rewrite added
 * 30 service-level tests but did NOT lock the upload route's own
 * contract (multer limit, mime whitelist, response shape). This file
 * closes that gap with source-text locks + router-stack introspection,
 * mirroring the pattern already used in `bodyMeasurementWriterChain.
 * test.mjs` for the BodyMeasurement write path.
 *
 * Why source-text and not supertest:
 *   The route chain is `protect → authorize → rateLimiter → multer →
 *   transcribeAudio/extractText → parseWorkoutTranscript → res.json`.
 *   Full behavioral coverage would require mocking all five middleware/
 *   service boundaries for a small contract check — 100+ lines of
 *   scaffold for marginal extra coverage over the existing Phase 10
 *   parser tests. Source-level locks are race-free, deterministic, and
 *   catch exactly the class of drift we care about here: accidental
 *   changes to the limit, the whitelist, or the response shape.
 *
 * What this file locks:
 *   1. multer fileSize limit is exactly 20MB (aligned with Gemini
 *      inline-data cap — Phase 10 change)
 *   2. transcript-class mime whitelist includes all 13 expected types
 *      and stays in sync with useFileAttachment.ts + the Phase 10
 *      parser test fixtures
 *   3. response contract is `{ success, transcript, parsedWorkout,
 *      metadata }` with metadata carrying filename/mimetype/size/
 *      clientId/trainerId/sessionId
 *   4. the routes are mounted as POST /upload and POST /history-preview
 *      with protect + authorize middleware still attached at the router level
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import workoutLogUploadRoutes from '../../routes/workoutLogUploadRoutes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTE_FILE = resolve(__dirname, '../../routes/workoutLogUploadRoutes.mjs');
const routeSource = readFileSync(ROUTE_FILE, 'utf8');

function findLayer(method, path) {
  return workoutLogUploadRoutes.stack.find(
    (layer) =>
      layer.route &&
      layer.route.path === path &&
      layer.route.methods &&
      layer.route.methods[method.toLowerCase()],
  );
}

function middlewareNames(layer) {
  return layer.route.stack.map((l) => l.name);
}

// ─────────────────────────────────────────────────────────────
// SECTION: multer size limit — 20MB alignment
// ─────────────────────────────────────────────────────────────
describe('workoutLogUploadRoutes — multer size limit', () => {
  it('enforces a 20MB fileSize cap (aligned with Gemini inline-data cap)', () => {
    // Phase 10 alignment 2026-04-14: the real upstream constraint is
    // voiceTranscriptionService.mjs:16 (20MB Gemini inline-data limit).
    // Frontend picker, multer, and Gemini all agree on 20MB now.
    expect(routeSource).toMatch(/fileSize:\s*20\s*\*\s*1024\s*\*\s*1024/);
  });

  it('does NOT accept the pre-Phase-10 50MB limit', () => {
    // Anti-regression lock: any slip back to 50MB would silently let
    // real Plaud exports pass multer and then fail at the Gemini step.
    expect(routeSource).not.toMatch(/fileSize:\s*50\s*\*\s*1024\s*\*\s*1024/);
  });

  it('documents the alignment decision in a dated comment', () => {
    // If someone raises the cap in the future without updating the
    // Gemini transcription service, this comment tells them where to
    // look. Locking its presence so a drive-by edit can't silently
    // delete the context.
    expect(routeSource).toMatch(/20MB[\s\S]{0,200}Gemini/);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION: transcript-class mime whitelist
// ─────────────────────────────────────────────────────────────
describe('workoutLogUploadRoutes — mime type whitelist', () => {
  // Must match the frontend TRANSCRIPT_CLASS_MIME_TYPES constant at
  // frontend/src/components/DashBoard/Pages/coach-assistant/hooks/
  // useFileAttachment.ts. Any addition/removal here MUST also be made
  // there or the two sides will drift (frontend accepts types the
  // backend rejects, or vice versa).
  const REQUIRED_MIMES = [
    // Audio
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/x-m4a',
    'audio/m4a',
    'audio/aac',
    'audio/flac',
    'audio/x-wav',
    // Text / docs
    'text/plain',
    'text/csv',
    'application/pdf',
  ];

  for (const mime of REQUIRED_MIMES) {
    it(`whitelist includes ${mime}`, () => {
      // Each mime must appear as a string literal inside the
      // allowedMimes array. Using the literal with surrounding quotes
      // to avoid false positives from comments.
      const literal = new RegExp(`['"]${mime.replace(/\//g, '\\/')}['"]`);
      expect(routeSource).toMatch(literal);
    });
  }

  it('uses an allowedMimes.includes(file.mimetype) shape in the fileFilter', () => {
    // Lock the filter shape so accidental refactors that drop the
    // whitelist-style check (e.g., replacing with a regex that's too
    // permissive) fail loudly.
    expect(routeSource).toMatch(/allowedMimes\.includes\(\s*file\.mimetype\s*\)/);
  });

  it('rejects unsupported file types with a sanitized error', () => {
    // Anti-regression on the user-facing error. Keep the message stable
    // without echoing the submitted MIME type or parser internals.
    expect(routeSource).toMatch(/Unsupported file type\. Upload an audio, text, CSV, or PDF file\./);
    expect(routeSource).not.toMatch(/Unsupported file type: \$\{file\.mimetype\}/);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION: response contract — the 4-key shape consumed by the
// frontend useTranscriptIntake.uploadTranscript() helper
// ─────────────────────────────────────────────────────────────
describe('workoutLogUploadRoutes — response contract', () => {
  it('res.json response body has the canonical 4-key shape', () => {
    // The frontend parses response.data.{success, transcript,
    // parsedWorkout, metadata}. Every field is load-bearing:
    //   - success: flips the review-card render
    //   - transcript: shown in the expandable preview
    //   - parsedWorkout: fed into parsedWorkoutToLogPayload mapper
    //   - metadata: file name/size/mime for the review card header
    // Lock the shape end-to-end.
    //
    // Match: res.json({ success: true, transcript, parsedWorkout, metadata: { ... } })
    expect(routeSource).toMatch(
      /res\.json\(\s*\{[\s\S]{0,600}success:\s*true[\s\S]{0,600}transcript[\s\S]{0,600}parsedWorkout[\s\S]{0,600}metadata:/,
    );
  });

  it('metadata carries filename, mimetype, size, clientId, and trainerId', () => {
    // Each field must be set inside the metadata object literal.
    expect(routeSource).toMatch(/metadata:\s*\{[\s\S]{0,600}filename:\s*file\.originalname/);
    expect(routeSource).toMatch(/metadata:\s*\{[\s\S]{0,600}mimetype:\s*file\.mimetype/);
    expect(routeSource).toMatch(/metadata:\s*\{[\s\S]{0,600}size:\s*file\.size/);
    expect(routeSource).toMatch(/metadata:\s*\{[\s\S]{0,600}clientId:\s*parsedClientId/);
    expect(routeSource).toMatch(/metadata:\s*\{[\s\S]{0,600}trainerId/);
  });

  it('strictly parses upload identity fields before transcription or parsing', () => {
    expect(routeSource).toContain('const parsedClientId = parseStrictPositiveInteger(clientId);');
    expect(routeSource).toContain('const parsedTrainerId = parseStrictPositiveInteger(req.user?.id);');
    expect(routeSource).toContain('const parsedSessionId = sessionId ? parseStrictPositiveInteger(sessionId) : null;');
    expect(routeSource).toContain("return res.status(400).json({ error: 'Valid clientId is required' });");
    expect(routeSource).toContain("return res.status(400).json({ error: 'Valid sessionId is required' });");
    expect(routeSource).not.toMatch(/parseInt\(\s*clientId\s*,\s*10\s*\)/);
    expect(routeSource).not.toMatch(/parseInt\(\s*sessionId\s*,\s*10\s*\)/);
  });

  it('does NOT ship a legacy `data:` or `result:` wrapper shape', () => {
    // Anti-regression: the old smart-workout-logger routes used to
    // wrap responses in `{ success, data: {...} }`. If anyone refactors
    // this route toward that pattern, the frontend mapper breaks.
    const resJsonIdx = routeSource.indexOf('res.json(');
    expect(resJsonIdx).toBeGreaterThan(0);
    const slice = routeSource.slice(resJsonIdx, resJsonIdx + 800);
    expect(slice).not.toMatch(/data:\s*\{[\s\S]{0,200}transcript/);
    expect(slice).not.toMatch(/result:\s*\{[\s\S]{0,200}transcript/);
  });

  it('error responses use { error: ... } shape, not { message: ... }', () => {
    // The frontend intake hook reads `e.response.data?.error` for
    // failure kinds; locking the error field name so a refactor to
    // `message` doesn't silently strip all error copy from the UI.
    expect(routeSource).toMatch(/res\.status\(\d+\)\.json\(\s*\{\s*error:/);
  });

  it('history preview response is draft-only and returns review candidates, not saved logs', () => {
    expect(routeSource).toMatch(
      /router\.post\(\s*['"]\/history-preview['"][\s\S]{0,3600}draftOnly:\s*true[\s\S]{0,1200}drafts:[\s\S]{0,1200}missingDraftRequests:/,
    );
    expect(routeSource).toMatch(/previewHistoricalWorkoutImport/);
    expect(routeSource).not.toMatch(/WorkoutLog\.create|DailyWorkoutForm\.create|adminClient|logWorkout\(/);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION: Router-stack introspection — route + middleware chain
// ─────────────────────────────────────────────────────────────
describe('workoutLogUploadRoutes — route mount + middleware chain', () => {
  it('POST /upload is mounted on the router', () => {
    const layer = findLayer('post', '/upload');
    expect(layer).toBeTruthy();
  });

  it('POST /upload allows admin/trainer/client/user roles with in-handler scope enforcement (3c.3)', () => {
    // router.use(protect) is applied at the router level. Launch 3c.3
    // un-gated /upload for client voice logging: the route-level
    // authorize now admits client/user too, and per-caller authority is
    // enforced INSIDE the handler by resolveVoiceUploadScope (clients
    // may only upload for themselves — 403 on any other clientId; see
    // tests/api/workoutLogUploadSelfAccess.test.mjs for the IDOR suite).
    // `authorize` returns an anonymous closure with no .name, so we
    // lock its presence via source-text match instead (same pattern
    // as bodyMeasurementWriterChain.test.mjs).
    expect(routeSource).toMatch(
      /router\.post\(\s*['"]\/upload['"][\s\S]{0,200}authorize\(\[['"]admin['"],\s*['"]trainer['"],\s*['"]client['"],\s*['"]user['"]\]\)/,
    );
    expect(routeSource).toMatch(/resolveVoiceUploadScope\(\{/);
  });

  it('router-level protect middleware is still applied', () => {
    // router.use(protect) is a separate construct from route-level
    // middleware, and it affects every route on the router — so a
    // drive-by removal silently opens the upload endpoint. Lock its
    // presence.
    expect(routeSource).toMatch(/router\.use\(protect\)/);
  });

  it('POST /upload has the rateLimiter middleware chained after authorize', () => {
    // The 10-uploads-per-15-min rate limit exists specifically to
    // protect against runaway transcription cost. If someone refactors
    // and accidentally drops it, the billing surprise is silent.
    expect(routeSource).toMatch(
      /router\.post\(\s*['"]\/upload['"][\s\S]{0,400}rateLimiter/,
    );
  });

  it('POST /history-preview is mounted with admin/trainer auth and upload rate limiting', () => {
    const layer = findLayer('post', '/history-preview');
    expect(layer).toBeTruthy();
    expect(routeSource).toMatch(
      /router\.post\(\s*['"]\/history-preview['"][\s\S]{0,200}authorize\(\[['"]admin['"],\s*['"]trainer['"]\]\)[\s\S]{0,300}rateLimiter[\s\S]{0,200}uploadFile/,
    );
  });

  it('POST /upload uses a route-local uploadFile wrapper around upload.single("file")', () => {
    // The frontend useTranscriptIntake.uploadTranscript() hook sends
    // exactly one file per FormData — locking the multer shape prevents
    // an accidental switch to `upload.array(...)` that would reshape
    // req.file → req.files and silently break everything downstream.
    expect(routeSource).toMatch(/function\s+uploadFile/);
    expect(routeSource).toMatch(/upload\.single\(\s*['"]file['"]\s*\)/);
    expect(routeSource).toMatch(
      /router\.post\(\s*['"]\/upload['"][\s\S]{0,500}rateLimiter[\s\S]{0,200}uploadFile/,
    );
  });

  it('does not expose any other HTTP methods on the router', () => {
    // Lock the router's public surface: GET /last-weights (blueprint S5
    // suggestions read), POST /upload, and POST /history-preview.
    // A future addition would need to extend this test.
    const routeLayers = workoutLogUploadRoutes.stack.filter((l) => l.route);
    expect(routeLayers).toHaveLength(3);
    const routes = routeLayers.map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods),
    }));
    expect(routes).toEqual([
      { path: '/last-weights', methods: ['get'] },
      { path: '/upload', methods: ['post'] },
      { path: '/history-preview', methods: ['post'] },
    ]);
  });
});
