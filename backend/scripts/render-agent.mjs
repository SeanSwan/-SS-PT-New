#!/usr/bin/env node
/**
 * render-agent — the worker. Runs on YOUR machine, not on Render.
 * ============================================================================
 *
 * Until this existed the pipeline was machinery with no operator: a queue, a leasing
 * service, a lease reaper and a presence guard, and nothing that could ever claim a job.
 *
 *   SWAN_AGENT_TOKEN=swan_agent_... node backend/scripts/render-agent.mjs \
 *     --api https://ss-pt-new.onrender.com --capabilities ffmpeg,mediasync
 *
 * ── WHY IT POLLS OUTBOUND ───────────────────────────────────────────────────
 * This process sits behind a home NAT beside ComfyUI, which ships with NO auth. A design
 * where the server initiates the connection means exposing that machine — a tunnel, an
 * open port, or a public URL in front of an unauthenticated GPU service. So the worker
 * reaches out and nothing inbound is ever required. Security decision, not convenience.
 *
 * ── WHY THE FIRST CAPABILITY IS SYNC, NOT RENDER ────────────────────────────
 * Audio sync needs ffmpeg and nothing else: no GPU, no model download, no Remotion
 * decision. It is the thinnest vertical that proves the ENTIRE queue is real — enrol,
 * lease, do genuinely useful work, report back — while doing the one job that is already
 * built and tested end-to-end.
 *
 * ── CRASH SEMANTICS ─────────────────────────────────────────────────────────
 * There is no local state to lose. A lease is heartbeat-extended; `kill -9` here means
 * the heartbeat stops, the lease expires, and the server-side sweeper requeues the job.
 * That is the whole recovery story, and it is why the sweeper had to be scheduled first.
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { extractMono } from '../services/mediaSync/audioExtract.mjs';
import { findOffset } from '../services/mediaSync/crossCorrelation.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? dflt : args[i + 1];
};

const API = (flag('api', process.env.SWAN_AGENT_API || 'http://localhost:10000')).replace(/\/$/, '');
const TOKEN = process.env.SWAN_AGENT_TOKEN || '';
const CAPABILITIES = String(flag('capabilities', 'ffmpeg,mediasync')).split(',').map((s) => s.trim()).filter(Boolean);
const IDLE_POLL_MS = Number(flag('idle-poll-ms', 5000));
const HEARTBEAT_MS = Number(flag('heartbeat-ms', 20000));
const ONCE = args.includes('--once');

/**
 * Only true when run as a CLI. Guarded because an earlier script in this module family
 * executed its main() on IMPORT — a smoke test imported it and silently regenerated every
 * fixture with default parameters, producing measurements that disagreed with the run
 * that supposedly created them. Here the stakes are higher: a bare import would exit the
 * importing process, so the work handler could never be unit-tested at all.
 */
const invokedDirectly = process.argv[1]
  && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;

let stopping = false;
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    // Finish the job in hand rather than abandoning a lease mid-render; a hard kill is
    // still safe (the sweeper reclaims it), this just avoids the wasted work.
    if (stopping) process.exit(1);
    stopping = true;
    log('shutdown requested — finishing current job, then exiting');
  });
}

const log = (msg) => process.stdout.write(`[agent] ${new Date().toISOString()} ${msg}\n`);

async function api(path, { method = 'POST', body } = {}) {
  const res = await fetch(`${API}/api/render-agents${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  let payload = null;
  try { payload = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error(payload?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = payload?.code;
    throw err;
  }
  return payload;
}

/**
 * The only handler that currently does real work. Everything else is refused explicitly
 * rather than faked — an agent that pretends to render is the same lie as an endpoint
 * that pretends to queue.
 */
async function runMediaSync(job, onProgress) {
  const p = job.params || {};
  const refPath = p.referencePath;
  const tgtPath = p.targetPath;
  if (!refPath || !tgtPath) {
    const e = new Error('mediasync requires params.referencePath and params.targetPath');
    e.permanent = true;
    throw e;
  }

  await onProgress(10, 'decoding reference');
  const ref = await extractMono(refPath, { sampleRate: p.sampleRate || 8000 });
  await onProgress(45, 'decoding target');
  const tgt = await extractMono(tgtPath, { sampleRate: p.sampleRate || 8000 });

  await onProgress(75, 'correlating');
  const result = findOffset(ref.samples, tgt.samples, {
    referenceSampleRate: ref.sampleRate,
    targetSampleRate: tgt.sampleRate,
    maxOffsetSeconds: p.maxOffsetSeconds || 120,
  });

  // A refusal is a legitimate ANSWER, not a crash: the engine is telling us the evidence
  // is too weak to trust. Reporting it as a failed job would be a lie in the other
  // direction, and retrying it would produce the same refusal forever.
  return {
    offsetSeconds: result.offsetSeconds,
    usable: result.usable,
    reason: result.reason,
    peak: result.peak,
    prominence: result.prominence,
    marginToRefusal: result.marginToRefusal,
    reference: { path: refPath, durationSec: ref.durationSec, sourceChannels: ref.source.channels },
    target: { path: tgtPath, durationSec: tgt.durationSec, sourceChannels: tgt.source.channels },
  };
}

const HANDLERS = { mediasync: runMediaSync };

async function handleJob(job) {
  log(`leased ${job.id} kind=${job.kind} workflow=${job.workflowId}`);

  let beat = null;
  const onProgress = async (progress, message) => {
    try {
      await api(`/jobs/${job.id}/heartbeat`, { body: { progress, message } });
    } catch (err) {
      // A failed heartbeat is not fatal here — the lease may still be valid, and the
      // sweeper is the backstop if it is not. Losing the JOB over a transient network
      // blip would be worse than finishing and discovering the lease was reclaimed.
      log(`heartbeat failed (non-fatal): ${err.message}`);
    }
  };

  try {
    // Keep the lease alive during long silent stretches of work.
    beat = setInterval(() => { onProgress(undefined, 'working'); }, HEARTBEAT_MS);
    if (typeof beat.unref === 'function') beat.unref();

    const kind = String(job.workflowId || '').split(':')[0];
    const handler = HANDLERS[kind];
    if (!handler) {
      const e = new Error(`No handler for workflow "${job.workflowId}". This agent advertises: ${CAPABILITIES.join(', ')}`);
      e.permanent = true;                 // retrying will not grow a handler
      throw e;
    }

    const output = await handler(job, onProgress);
    clearInterval(beat); beat = null;

    // `r2Key` is the queue's required artifact pointer. Sync produces a measurement, not
    // a file, so the result travels in metadata under a deterministic key. When R2 upload
    // lands this becomes a real object; the shape does not change.
    await api(`/jobs/${job.id}/complete`, {
      body: { r2Key: `jobs/${job.id}/mediasync.json`, mime: 'application/json', output },
    });
    log(`completed ${job.id} -> offset ${output.offsetSeconds?.toFixed?.(4)}s usable=${output.usable}`);
  } catch (err) {
    if (beat) clearInterval(beat);
    log(`FAILED ${job.id}: ${err.message}`);
    try {
      await api(`/jobs/${job.id}/fail`, {
        body: {
          errorCode: err.permanent ? 'AGENT_UNSUPPORTED' : 'AGENT_ERROR',
          errorMessage: err.message.slice(0, 500),
          retryable: !err.permanent,
        },
      });
    } catch (reportErr) {
      // Could not even report the failure — let the lease expire and the sweeper
      // requeue. Silence here is recoverable; a wrong "completed" would not be.
      log(`could not report failure (lease will expire and be reclaimed): ${reportErr.message}`);
    }
  }
}

async function main() {
  log(`starting — api=${API} capabilities=${CAPABILITIES.join(',')}`);
  let idleLogged = false;

  while (!stopping) {
    let payload;
    try {
      payload = await api('/lease');
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        log(`FATAL: ${err.message} (${err.code}) — token is invalid or revoked`);
        process.exit(3);
      }
      // Back off on transport errors; the server may be deploying.
      log(`lease failed: ${err.message} — retrying in ${IDLE_POLL_MS}ms`);
      await sleep(IDLE_POLL_MS);
      continue;
    }

    if (!payload?.data?.job) {
      if (!idleLogged) { log('idle — no work available'); idleLogged = true; }
      if (ONCE) { log('--once: nothing to do, exiting'); return; }
      await sleep(IDLE_POLL_MS);
      continue;
    }

    idleLogged = false;
    await handleJob(payload.data.job);
    if (ONCE) { log('--once: job handled, exiting'); return; }
  }
  log('stopped');
}

if (invokedDirectly) {
  if (!TOKEN) {
    process.stderr.write('\n  SWAN_AGENT_TOKEN is required (from POST /api/render-agents/enrol)\n\n');
    process.exit(2);
  }
  main().catch((err) => {
    process.stderr.write(`\n[agent] fatal: ${err.message}\n\n`);
    process.exit(1);
  });
}

// Exported so the work handler — the only part that touches real media — is testable
// without standing up a server or holding a credential.
export { runMediaSync, HANDLERS, main as runAgentLoop };
