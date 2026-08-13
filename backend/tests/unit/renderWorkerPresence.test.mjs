/**
 * Worker presence — the guard that stops "queued" from becoming the next lie.
 * ============================================================================
 *
 * The endpoint this supports used to return `success: true, status: 'waiting'` while
 * rendering nothing. Replacing that with a real queue insert fixes the write but not the
 * promise: with no worker enrolled, a genuine row in `video_render_jobs` is the SAME
 * false claim in better clothing, and harder to catch because the row really exists.
 *
 * These tests pin the honest answer to "will this actually move?" — including the two
 * distinct ways it will not, which have different operator fixes: nobody enrolled at all
 * vs enrolled-but-offline vs online-but-cannot-do-this-kind-of-work.
 */

import { describe, it, expect } from 'vitest';
import {
  describePresence,
  WORKER_STALE_AFTER_SECONDS,
} from '../../services/renderWorkerPresence.mjs';

describe('describePresence — never implies motion that cannot happen', () => {
  it('distinguishes "none enrolled" from "enrolled but offline"', () => {
    // Different operator fixes: set a worker up, vs go turn the existing one on.
    const none = describePresence({ live: 0, total: 0, missingCapabilities: [] });
    expect(none.startable).toBe(false);
    expect(none.code).toBe('NO_WORKER_ENROLLED');
    expect(none.message).toMatch(/set up/i);

    const offline = describePresence({ live: 0, total: 3, missingCapabilities: [] });
    expect(offline.startable).toBe(false);
    expect(offline.code).toBe('NO_WORKER_ONLINE');
    expect(offline.message).toMatch(/when one connects/i);
  });

  it('refuses to promise motion when no online worker has the capability', () => {
    // A fleet that is up but cannot do THIS job queues forever just as effectively.
    const d = describePresence({ live: 2, total: 2, missingCapabilities: ['remotion'] });
    expect(d.startable).toBe(false);
    expect(d.code).toBe('NO_WORKER_WITH_CAPABILITY');
    expect(d.message).toContain('remotion');
  });

  it('only promises motion when a capable worker is actually online', () => {
    const d = describePresence({ live: 2, total: 5, missingCapabilities: [] });
    expect(d.startable).toBe(true);
    expect(d.code).toBe('WORKER_ONLINE');
    expect(d.message).toMatch(/2 workers online/);
  });

  it('says "1 worker" not "1 workers"', () => {
    expect(describePresence({ live: 1, total: 1, missingCapabilities: [] }).message)
      .toMatch(/1 worker online/);
  });

  /**
   * The failure mode that matters most: if a malformed/absent presence object made
   * `startable` default to true, the UI would claim progress in exactly the situation
   * this module exists to expose. Fail closed.
   */
  it('fails CLOSED on missing or malformed input', () => {
    for (const bad of [null, undefined, {}, { live: undefined }]) {
      const d = describePresence(bad);
      expect(d.startable).toBe(false);
    }
  });

  it('tolerates a missing missingCapabilities field without promising motion falsely', () => {
    const d = describePresence({ live: 1, total: 1 });
    expect(d.startable).toBe(true);      // capable-unknown but online
    expect(d.code).toBe('WORKER_ONLINE');
  });

  it('gives a stale window longer than one heartbeat so a single miss is not an outage', () => {
    // Derived, not restated: the point is headroom over the heartbeat cadence.
    expect(WORKER_STALE_AFTER_SECONDS).toBeGreaterThan(60);
  });
});
