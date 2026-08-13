/**
 * Retry classification — the flag that decides whether a doomed job loops.
 * ============================================================================
 *
 * `retryable` controls whether a failed job goes back on the queue. The first version of
 * the agent reported EVERY extraction failure as retryable, so a missing file, a
 * non-media file, and a directory each burned the job's entire attempt budget in a loop —
 * occupying lease slots ahead of real work and ending in the identical failure hours
 * later. Measured before the fix: all three reported permanent:false.
 *
 * The line is structural-vs-environmental, not error-vs-success:
 *   permanent   the INPUT is wrong — retrying cannot change it
 *   retryable   the ENVIRONMENT was wrong — a later attempt genuinely might work
 *
 * Getting this backwards in the other direction is just as bad: marking a transient
 * timeout permanent throws away a job that would have succeeded.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let dir;
let runMediaSync;

beforeEach(async () => {
  ({ runMediaSync } = await import('../../scripts/render-agent.mjs'));
  dir = mkdtempSync(join(tmpdir(), 'agent-cls-test-'));
});

const cleanup = () => { if (dir) rmSync(dir, { recursive: true, force: true }); };

describe('extraction failures that can NEVER succeed are permanent', () => {
  it('marks a non-media file permanent', async () => {
    const p = join(dir, 'not-media.txt');
    writeFileSync(p, 'this is not a video');
    await expect(runMediaSync({ id: 'j', params: { referencePath: p, targetPath: p } }, () => {}))
      .rejects.toMatchObject({ permanent: true });
    cleanup();
  }, 60_000);

  it('marks a missing file permanent — the path will not appear later', async () => {
    const p = join(dir, 'nope.mp4');
    await expect(runMediaSync({ id: 'j', params: { referencePath: p, targetPath: p } }, () => {}))
      .rejects.toMatchObject({ permanent: true });
    cleanup();
  }, 60_000);

  it('marks missing params permanent — a retry grows no parameters', async () => {
    await expect(runMediaSync({ id: 'j', params: {} }, () => {}))
      .rejects.toMatchObject({ permanent: true });
    cleanup();
  });
});

describe('the classifier itself — called directly, not re-implemented', () => {
  /**
   * An earlier version of this block re-declared the regex INSIDE the test and asserted
   * it against itself — it would have passed with the classifier deleted. Import the real
   * function; a test that restates the implementation proves only that copy-paste works.
   */
  const cases = [
    // permanent: the INPUT is wrong, a retry cannot change it
    ['could not probe /x.txt: no audio stream found', true],
    ['decoded zero audio bytes', true],
    ['decoded 3 non-finite sample(s), first at 6.000s — the audio stream is corrupt', true],
    ['decoded 999 bytes, not a multiple of 4 (truncated stream?)', true],
    ['audio exceeds 86MB decode cap (10800s at 8000Hz)', true],
    // retryable: the ENVIRONMENT was wrong, a later attempt may genuinely work
    ['ffmpeg timed out after 300000ms', false],
    ['ffmpeg failed to start: ENOENT', false],
    // unknown shapes must NOT be assumed permanent — throwing away a job that would
    // have succeeded is the worse direction to be wrong.
    ['something nobody anticipated', false],
    ['', false],
  ];

  it('classifies every failure mode the extraction layer can produce', async () => {
    const { isPermanentExtractionFailure } = await import('../../scripts/render-agent.mjs');
    for (const [message, expected] of cases) {
      expect(isPermanentExtractionFailure({ message }), `"${message}"`).toBe(expected);
    }
  });

  it('trusts the probe when it classifies its own corruption', async () => {
    const { isPermanentExtractionFailure } = await import('../../scripts/render-agent.mjs');
    expect(isPermanentExtractionFailure({ message: 'could not probe x', detail: { cause: 'ClipCorruptError' } })).toBe(true);
    // A probe TIMEOUT is environmental even though it arrives on the same path.
    expect(isPermanentExtractionFailure({ message: 'ffmpeg timed out after 60000ms', detail: { cause: 'ClipProbeTimeoutError' } })).toBe(false);
  });

  it('survives malformed errors without crashing the failure path', async () => {
    const { isPermanentExtractionFailure } = await import('../../scripts/render-agent.mjs');
    for (const bad of [null, undefined, {}, 'string', 0]) {
      expect(() => isPermanentExtractionFailure(bad)).not.toThrow();
    }
  });
});
