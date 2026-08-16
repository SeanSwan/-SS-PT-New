// NOTE: deliberately NO shebang, and it must stay absent.
// This module is imported by tests, and esbuild (vitest) fails on a shebang in a
// NON-entry module. With a CRLF checkout the shebang line ends in a carriage
// return, and that CR is the reported 'Invalid or unexpected token'. Invoke this
// as `node backend/scripts/render-agent.mjs` - the shebang bought nothing on
// Windows and cost the whole file its testability.
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
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractMono } from '../services/mediaSync/audioExtract.mjs';
import { findOffset } from '../services/mediaSync/crossCorrelation.mjs';
import { runGenerate } from './handlers/generateVideo.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Where the credential may live, in priority order. Env var first so CI and one-off runs
 * keep working; then a gitignored file, because the alternative is pasting a 75-character
 * secret into a shell on every launch — which is both miserable and puts the token in
 * shell history, where it outlives the session and gets read back by anything scraping it.
 *
 * The file form also matches what the enrolment modal's "Download .env" button produces,
 * so the operator can save it once and never handle the string again.
 */
const TOKEN_FILE_CANDIDATES = [
  join(HERE, '..', '.swan-agent.env'),        // backend/.swan-agent.env
  join(HERE, '..', '..', '.swan-agent.env'),  // <repo>/.swan-agent.env
];

/** Parse `SWAN_AGENT_TOKEN=...` without pulling the whole file into env. */
function tokenFromFile(path) {
  try {
    const line = readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .find((l) => /^\s*SWAN_AGENT_TOKEN\s*=/.test(l));
    if (!line) return '';
    // Strip an optional quote pair; a token pasted with quotes is the common slip.
    return line.replace(/^\s*SWAN_AGENT_TOKEN\s*=\s*/, '').trim().replace(/^["']|["']$/g, '');
  } catch {
    return '';
  }
}

function resolveToken(explicitFile) {
  if (process.env.SWAN_AGENT_TOKEN) return { token: process.env.SWAN_AGENT_TOKEN, from: 'SWAN_AGENT_TOKEN env var' };
  const candidates = explicitFile ? [resolve(explicitFile)] : TOKEN_FILE_CANDIDATES;
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const token = tokenFromFile(path);
    if (token) return { token, from: path };
  }
  return { token: '', from: null };
}

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? dflt : args[i + 1];
};

const API = (flag('api', process.env.SWAN_AGENT_API || 'http://localhost:10000')).replace(/\/$/, '');
const { token: TOKEN, from: TOKEN_SOURCE } = resolveToken(flag('token-file', ''));
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
/**
 * Is this extraction failure ever going to succeed on a retry?
 *
 * It matters because `retryable` decides whether the job goes back on the queue. A file
 * that does not exist, is not media, or is a directory will NEVER become valid — but the
 * first version reported all of them as retryable, so each one burned the job's entire
 * attempt budget in a loop, occupying lease slots ahead of real work and ending in the
 * same failure hours later. Measured: missing file, non-media file, and a directory all
 * reported permanent:false.
 *
 * The distinction is structural-vs-environmental, not error-vs-success:
 *   permanent   the INPUT is wrong — wrong path, no audio stream, corrupt stream
 *   retryable   the ENVIRONMENT was wrong — timeout, ffmpeg missing, transient mount
 */
export function isPermanentExtractionFailure(err) {
  // The probe classifies its own failures; a corrupt/unreadable clip is about the file.
  if (err?.detail?.cause === 'ClipCorruptError') return true;
  const m = String(err?.message || '');
  if (/timed out/i.test(m)) return false;              // may succeed on a quieter machine
  if (/failed to start/i.test(m)) return false;        // ffmpeg absent — an env fix
  return /no audio stream|zero audio bytes|non-finite|not a multiple of 4|exceeds .* cap|does not exist/i.test(m);
}

async function extractOrClassify(filePath, opts) {
  try {
    return await extractMono(filePath, opts);
  } catch (err) {
    err.permanent = isPermanentExtractionFailure(err);
    throw err;
  }
}

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
  const ref = await extractOrClassify(refPath, { sampleRate: p.sampleRate || 8000 });
  await onProgress(45, 'decoding target');
  const tgt = await extractOrClassify(tgtPath, { sampleRate: p.sampleRate || 8000 });

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

const HANDLERS = { mediasync: runMediaSync, generate: runGenerate };

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
  // The SOURCE, never the value. A token echoed into a log is a token in a log.
  log(`credential loaded from ${TOKEN_SOURCE}`);
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
    process.stderr.write(
      '\n  No agent token found.\n\n'
      + '  Give it to me either way:\n'
      + '    1. Save it to a file (recommended — keeps it out of shell history):\n'
      + `         ${TOKEN_FILE_CANDIDATES[0]}\n`
      + '       containing one line:  SWAN_AGENT_TOKEN=swan_agent_...\n'
      + '    2. Or set the SWAN_AGENT_TOKEN environment variable.\n\n'
      + '  Get a token from Content Studio -> Render Queue -> Enrol this machine.\n\n',
    );
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
