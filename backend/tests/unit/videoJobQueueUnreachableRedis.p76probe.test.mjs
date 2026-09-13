/**
 * P76 PROBE — "Redis configured but unreachable" vs the video job queue
 * =====================================================================
 *
 * Settles the question doc 76 explicitly leaves open
 * (docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/76-correction-phantom-bullmq-control.md,
 * "Explicitly not claimed", lines 60-65):
 *
 *   "Whether a request that triggers the import can be held by an unreachable
 *    Redis is a real, narrower, uninvestigated question."
 *
 * This file ANSWERS it by measurement. It is a probe first and a regression
 * guard second — every number below is observed, not asserted from reading.
 *
 * What is measured
 * ----------------
 * A. REDIS_URL is set to a loopback port with nothing listening (that is
 *    "configured but unreachable" — NOT an unset variable, which the existing
 *    suite already covers).
 * B. The exact call the two controllers make: the lazy
 *    `await import('../services/videoJobQueue.mjs')` followed by
 *    `addJob('checksum_verify', …)` (videoCatalogController.mjs:43 + :655).
 * C. Whether the BullMQ connection option `maxRetriesPerRequest: null`
 *    (videoJobQueue.mjs:353) makes a command queue indefinitely instead of
 *    failing fast, contrasted against the bounded client at :356-361.
 *
 * Why zero-dial is the decisive assertion
 * ---------------------------------------
 * Wall-clock alone can be faked by a slow machine; "it returned null" alone
 * cannot distinguish "never dialled" from "dialled and gave up". So this probe
 * counts real outbound TCP connect attempts and asserts the count is ZERO.
 * A negative control proves the counter is live and that the port genuinely
 * refuses, which is what makes a zero count meaningful rather than vacuous.
 *
 * Isolation: no real Redis, no external network, no shared database. Loopback
 * only, and (per the reviewed preload) only on a port >= 32768.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import net from 'node:net';

// The reviewed preload (tmp/coach-astra-hostile-20260912/backend-post-hr11-preload.cjs)
// permits loopback TCP only for `port >= 32768` and `port !== 55439`. A probe
// port below that floor would be rejected by the harness, not by Redis, so we
// assert the floor explicitly instead of silently measuring the wrong thing.
const PRELOAD_PORT_FLOOR = 32768;
const PRELOAD_DENIED_PORT = 55439;

// ── instrument: count outbound TCP connect attempts ─────────────────────────
// Wraps whatever `net.Socket.prototype.connect` already is (the preload's
// guarded version), so the harness deny-rule is preserved: we observe, we do
// not bypass.
const upstreamConnect = net.Socket.prototype.connect;
const connectAttempts = [];

net.Socket.prototype.connect = function patchedConnect(...args) {
  let first = args[0];
  if (Array.isArray(first)) first = first[0];
  const opts =
    typeof first === 'object'
      ? first
      : { port: first, host: typeof args[1] === 'string' ? args[1] : 'localhost' };
  connectAttempts.push({ host: opts.host || 'localhost', port: Number(opts.port) });
  return upstreamConnect.apply(this, args);
};

// ── helpers ─────────────────────────────────────────────────────────────────

/** Allocate a loopback port, release it, and return it (nothing listens after). */
async function allocateRefusedLoopbackPort() {
  const srv = net.createServer();
  await new Promise((resolve, reject) => {
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', resolve);
  });
  const { port } = srv.address();
  await new Promise((resolve) => srv.close(resolve));

  if (port < PRELOAD_PORT_FLOOR || port === PRELOAD_DENIED_PORT) {
    throw new Error(
      `PROBE HARNESS MISMATCH: allocated port ${port} is outside the preload's ` +
        `permitted loopback range (>= ${PRELOAD_PORT_FLOOR}, != ${PRELOAD_DENIED_PORT}). ` +
        `Any dial would be denied by the harness, not refused by the OS, so this ` +
        `probe cannot measure what it claims. Refusing to run.`
    );
  }
  return port;
}

/** Attempt a raw TCP connect and report whether it is refused. */
function probeRefusal(port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const sock = net.connect(port, '127.0.0.1');
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      resolve(result);
    };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => finish({ refused: false, code: 'CONNECTED' }));
    sock.once('error', (err) => finish({ refused: true, code: err.code }));
    sock.once('timeout', () => finish({ refused: false, code: 'SOCKET_TIMEOUT' }));
  });
}

/**
 * The measurement instrument under control test: report whether a promise
 * settles (and how) or is still pending after `ms`.
 */
function settleOrTimeout(promise, ms) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve({ outcome: 'timeout', elapsedMs: ms });
    }, ms);
    promise.then(
      (value) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ outcome: 'resolved', value });
      },
      (error) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ outcome: 'rejected', error });
      }
    );
  });
}

let refusedPort;
let redisUrl;

beforeAll(async () => {
  refusedPort = await allocateRefusedLoopbackPort();
  redisUrl = `redis://127.0.0.1:${refusedPort}`;
  process.env.REDIS_URL = redisUrl;
  console.log(`[P76-PROBE] REDIS_URL=${redisUrl} (configured, nothing listening)`);
});

// ── controls: prove the instrument discriminates ────────────────────────────

describe('P76 probe / instrument controls', () => {
  it('NEGATIVE CONTROL — settleOrTimeout reports fast-resolve, reject and genuine hang differently', async () => {
    const resolved = await settleOrTimeout(Promise.resolve('ok'), 200);
    expect(resolved.outcome).toBe('resolved');
    expect(resolved.value).toBe('ok');

    const rejected = await settleOrTimeout(Promise.reject(new Error('boom')), 200);
    expect(rejected.outcome).toBe('rejected');
    expect(rejected.error.message).toBe('boom');

    const hung = await settleOrTimeout(new Promise(() => {}), 200);
    expect(hung.outcome).toBe('timeout');

    expect(new Set([resolved.outcome, rejected.outcome, hung.outcome]).size).toBe(3);
  });

  it('NEGATIVE CONTROL — the connect counter is live AND the probe port genuinely refuses', async () => {
    const before = connectAttempts.length;

    const result = await probeRefusal(refusedPort);

    expect(result.refused).toBe(true);
    expect(result.code).toBe('ECONNREFUSED');
    // The counter must have observed the control dial, otherwise a later
    // "zero attempts" reading would be a broken counter, not a real fact.
    expect(connectAttempts.length).toBe(before + 1);
    expect(connectAttempts.at(-1)).toEqual({ host: '127.0.0.1', port: refusedPort });
  });
});

// ── the measured path ───────────────────────────────────────────────────────

describe('P76 probe / lazy import + addJob against unreachable Redis', () => {
  let mod;

  it('the lazy dynamic import alone dials nothing', async () => {
    const before = connectAttempts.length;
    const t0 = performance.now();

    mod = await import('../../services/videoJobQueue.mjs');

    const elapsedMs = performance.now() - t0;
    console.log(
      `[P76-PROBE] lazy import: ${elapsedMs.toFixed(1)} ms, connect attempts=${connectAttempts.length - before}`
    );

    expect(typeof mod.addJob).toBe('function');
    expect(connectAttempts.length - before).toBe(0);
  });

  it('REQUEST PATH — addJob() returns null promptly and never dials Redis', async () => {
    expect(process.env.REDIS_URL).toBe(redisUrl);

    const before = connectAttempts.length;
    const t0 = performance.now();

    // Exactly what videoCatalogController.mjs:655 does.
    const job = await mod.addJob('checksum_verify', {
      videoId: 'p76-probe-fixture',
      key: 'probe/object/key',
    });

    const elapsedMs = performance.now() - t0;
    console.log(
      `[P76-PROBE] addJob() against unreachable Redis: result=${JSON.stringify(job)}, ` +
        `elapsed=${elapsedMs.toFixed(1)} ms, connect attempts=${connectAttempts.length - before}`
    );

    // Decisive, non-timing assertion: the request path never opened a socket.
    expect(connectAttempts.length - before).toBe(0);
    // And it degrades honestly rather than throwing.
    expect(job).toBeNull();
    // Bounded wall-clock, well inside any request budget.
    expect(elapsedMs).toBeLessThan(1000);
  });
});

// ── the BullMQ connection option, contrasted ────────────────────────────────

describe('P76 probe / maxRetriesPerRequest semantics', () => {
  it('maxRetriesPerRequest: null (videoJobQueue.mjs:353) does NOT fail fast', async () => {
    const { default: Redis } = await import('ioredis');

    // Exactly the BullMQ connection options built at videoJobQueue.mjs:351-355.
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    try {
      const t0 = performance.now();
      const result = await settleOrTimeout(client.get('p76-probe'), 4000);
      const elapsedMs = performance.now() - t0;
      console.log(
        `[P76-PROBE] maxRetriesPerRequest=null: outcome=${result.outcome} after ${elapsedMs.toFixed(1)} ms`
      );
      expect(result.outcome).toBe('timeout');
    } finally {
      client.disconnect();
    }
  }, 15000);

  it('CONTRAST — maxRetriesPerRequest: 3 (videoJobQueue.mjs:357) rejects promptly', async () => {
    const { default: Redis } = await import('ioredis');

    // Exactly the separate-client options at videoJobQueue.mjs:356-361.
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    try {
      const t0 = performance.now();
      const result = await settleOrTimeout(client.get('p76-probe'), 4000);
      const elapsedMs = performance.now() - t0;
      console.log(
        `[P76-PROBE] maxRetriesPerRequest=3: outcome=${result.outcome}` +
          (result.error ? ` error=${result.error.message}` : '') +
          ` after ${elapsedMs.toFixed(1)} ms`
      );

      expect(result.outcome).toBe('rejected');
      expect(elapsedMs).toBeLessThan(4000);
      expect(connectAttempts.length).toBeGreaterThan(0);
    } finally {
      client.disconnect();
    }
  }, 15000);
});
