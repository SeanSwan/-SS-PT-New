/**
 * Launch audit 2026-08-04 — paid-inference cost-abuse coverage.
 *
 * Two routes reached paid Gemini inference with NO per-user limiter:
 *   - formAnalysisRoutes  POST /:id/reprocess  — re-runs the full form
 *     analysis, re-uploading a video up to 100MB, while its sibling /upload
 *     requires ('elite','video.formcheck'). Ownership was enforced, so this
 *     was cost abuse rather than IDOR: loop it on your OWN analysis and bill
 *     unbounded inference.
 *   - scheduleAiRoutes    POST /proposals      — routes 2000-char messages to
 *     Gemini with no limiter, tier gate, or per-user cap.
 *
 * These assertions pin the limiter onto both routes. A missing spend cap is
 * invisible until the bill arrives, which is exactly why it needs a test.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sliceBetween } from '../helpers/sliceBetween.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(__dirname, p), 'utf8').replace(/\r\n/g, '\n');

const formAnalysisSource = read('../../routes/formAnalysisRoutes.mjs');
const scheduleAiSource = read('../../routes/scheduleAiRoutes.mjs');

describe('paid-inference routes carry a per-user spend limiter', () => {
  it('formAnalysis /:id/reprocess is rate limited', () => {
    expect(formAnalysisSource).toContain("import { aiRateLimiter } from '../middleware/aiRateLimiter.mjs'");
    expect(formAnalysisSource).toContain("router.post('/:id/reprocess', aiRateLimiter,");
    // The un-limited form must not come back.
    expect(formAnalysisSource).not.toContain("router.post('/:id/reprocess', async");
  });

  it('scheduleAi /proposals is rate limited', () => {
    expect(scheduleAiSource).toContain("import { aiRateLimiter } from '../middleware/aiRateLimiter.mjs'");
    expect(scheduleAiSource).toContain("router.post('/proposals', protect, aiRateLimiter,");
    expect(scheduleAiSource).not.toContain("router.post('/proposals', protect, async");
  });

  it('the limiter it points at is per-user, not global-only', () => {
    // A global-only limiter would let one abuser starve everyone else and
    // would not bound per-account spend — the property we actually need.
    const limiterSource = read('../../middleware/aiRateLimiter.mjs');
    const fnBody = sliceBetween(
      limiterSource,
      'export function aiRateLimiter',
      'const result = checkRateLimit',
      { label: 'aiRateLimiter guard' },
    );
    expect(fnBody).toContain('req.user?.id');
    expect(limiterSource).toContain('checkRateLimit(userId)');
  });
});
