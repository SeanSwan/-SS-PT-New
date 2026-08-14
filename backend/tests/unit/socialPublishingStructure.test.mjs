/**
 * The 300-line rule, enforced for the social publishing module set
 * ================================================================
 * The frontend has had a line-cap gate for a while; the backend has not, and it
 * shows. Two files in this area crossed 300 unnoticed — one before the current
 * work started, and one DURING a slice whose whole purpose was hardening this
 * module, caught a slice later by eye rather than by a gate.
 *
 * A rule nothing checks is a rule that gets broken by the person who wrote it.
 * This is the cheap mirror of the frontend gate, scoped to the files this
 * module actually owns rather than the whole backend, so it fails on a real
 * regression instead of on a pre-existing baseline nobody has agreed to fix.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = resolve(__dirname, '../..');

const LINE_CAP = 300;

const GOVERNED_FILES = [
  'services/nativeSocialPublishingService.mjs',
  'services/socialPublishFanOut.mjs',
  'services/socialCredentialRefresh.mjs',
  'services/socialImmediatePublish.mjs',
  'services/socialJobScheduler.mjs',
  'services/socialJobRetry.mjs',
  'services/socialProviders/blueskyPublisher.mjs',
  'routes/adminSocialPublishingRoutes.mjs',
  'routes/adminSocialPublishingHelpers.mjs',
  'jobs/marketingPublisherWorker.mjs',
];

describe('social publishing stays inside the project line cap', () => {
  it.each(GOVERNED_FILES)('%s is under the cap', (relativePath) => {
    const absolutePath = resolve(BACKEND_ROOT, relativePath);
    // A missing file here means the module was split or renamed without
    // updating this list, which would silently stop governing it.
    expect(existsSync(absolutePath), `${relativePath} should exist — update GOVERNED_FILES if it moved`).toBe(true);

    const lines = readFileSync(absolutePath, 'utf8').split(/\r?\n/).length;
    expect(lines, `${relativePath} is ${lines} lines; extract before it passes ${LINE_CAP}`)
      .toBeLessThanOrEqual(LINE_CAP);
  });
});
