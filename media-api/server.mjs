/**
 * server.mjs — the HTTP surface. Zero dependencies, because the alternative is a
 * framework whose upgrade path becomes a second thing to keep green.
 *
 * ── FAIL-CLOSED, TWICE ──────────────────────────────────────────────────────
 * 1. NO TOKEN, NO SERVER. If `SWAN_MEDIA_API_TOKEN` is unset the process REFUSES TO
 *    START. Starting and refusing every request reads as a broken deployment rather
 *    than an unconfigured one, and the first thing anyone does with a "broken" local
 *    API is look for a flag to turn the check off.
 *
 * 2. LOOPBACK ONLY. This process can spend money and can reach a ComfyUI that has NO
 *    AUTHENTICATION of its own. Binding a routable address would put an unauthenticated
 *    GPU behind a token that a shell history can leak. Astra's ruling is the same and
 *    stricter: "Remote callers use SSH forwarding exclusively... No LAN/tailnet bind."
 *
 * ── THE BACKGROUND RUN ──────────────────────────────────────────────────────
 * `runGenerate` blocks for the length of a render, and a render is minutes. So
 * submission returns 202 immediately and the work runs detached, updating the job
 * store as it goes.
 *
 * Astra's warning is recorded rather than solved: the critical failure window is
 * "backend acceptance before backend ID persistence". A crash inside it can lose the
 * link between our job id and the backend's. The mitigation here is to persist the
 * intent BEFORE dispatch and to never auto-retry a billed job — which is weaker than
 * Astra's `reconciling` + operator-intervention requirement. Flagged in the README.
 */

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createReadStream, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import { runGenerate } from '../backend/scripts/handlers/generateVideo.mjs';
import { makeFileLedger } from '../shared/providers/video/spendGuard.mjs';
import { makeJobStore, makeQuoteStore, STATUS } from './store.mjs';
// Only `createJob` and `fail` are needed here now that the route table moved out: the
// handler dispatches through `matchRoute`, and the one handler it names by identity is
// `createJob`, to attach the Idempotency-Key.
import { createJob, fail } from './routes.mjs';
import { matchRoute } from './router.mjs';
// The replay path returns the SAME projection as the first call. It previously
// returned a hand-rolled `{id, state}`, so one endpoint answered the same 202 with two
// different body shapes depending on whether the caller had retried — and a client
// written against the first shape would read `undefined` on every field it needed.
import { publicJob } from './wire.mjs';
import { safeEqual, authorized, readBody, send } from './http.mjs';

export const DEFAULT_PORT = 8788;

class ConfigError extends Error {
  constructor(code, message) { super(message); this.name = 'ConfigError'; this.code = code; }
}

/** Read configuration, or refuse. Every refusal names the variable to set. */
export function readServerConfig(env = process.env) {
  const token = String(env.SWAN_MEDIA_API_TOKEN || '').trim();
  if (!token) {
    throw new ConfigError('E_NO_TOKEN',
      'SWAN_MEDIA_API_TOKEN is unset, so the gateway will not start. This process can spend money '
      + 'and can reach a ComfyUI with no authentication of its own. Set a token to a long random '
      + 'string, then pass it as `Authorization: Bearer <token>`.');
  }
  if (token.length < 16) {
    throw new ConfigError('E_WEAK_TOKEN',
      `SWAN_MEDIA_API_TOKEN is ${token.length} characters. Use at least 16 — this token is the only `
      + 'thing between a routable request and a GPU.');
  }

  const host = String(env.SWAN_MEDIA_API_HOST || '127.0.0.1').trim();
  const loopback = host === '127.0.0.1' || host === '::1' || host === 'localhost';
  const override = String(env.SWAN_MEDIA_API_ALLOW_NON_LOOPBACK || '') === '1';
  if (!loopback && !override) {
    throw new ConfigError('E_NOT_LOOPBACK',
      `Refusing to bind ${host}. ComfyUI has no authentication and this gateway can spend money, so `
      + 'remote access is SSH forwarding — `ssh -L 8788:127.0.0.1:8788 <host>` — not a routable bind. '
      + 'If you have genuinely decided otherwise, set SWAN_MEDIA_API_ALLOW_NON_LOOPBACK=1 and accept '
      + 'that the token is now the only control.');
  }

  const root = env.SWAN_MEDIA_API_ROOT || process.cwd();
  return {
    token,
    host,
    port: Number(env.SWAN_MEDIA_API_PORT) || DEFAULT_PORT,
    nonLoopbackAcknowledged: !loopback && override,
    outDir: resolvePath(env.SWAN_MEDIA_API_OUT_DIR || join(root, 'media-api', 'out')),
    ledgerPath: resolvePath(env.SWAN_MEDIA_API_LEDGER || join(root, 'media-api', 'usage-ledger.json')),
    jobsPath: resolvePath(env.SWAN_MEDIA_API_JOBS || join(root, 'media-api', 'jobs.json')),
    quotesPath: resolvePath(env.SWAN_MEDIA_API_QUOTES || join(root, 'media-api', 'quotes.json')),
  };
}


/** Build the server. Everything injectable, so a test drives the real router over a
 *  real socket without a GPU, a vendor, or a render. */
export function buildServer({ env = process.env, deps = {} } = {}) {
  const cfg = readServerConfig(env);
  const { fs: ledgerFs = null, runGenerateImpl = runGenerate, now = () => new Date() } = deps;

  if (!existsSync(cfg.outDir)) mkdirSync(cfg.outDir, { recursive: true });

  const ledger = deps.ledger
    || makeFileLedger(cfg.ledgerPath, ledgerFs || { readFileSync, writeFileSync });
  const jobs = deps.jobs || makeJobStore(cfg.jobsPath, { now });
  const quotes = deps.quotes || makeQuoteStore(cfg.quotesPath, { now });

  // Anything non-terminal belongs to a process that no longer exists.
  const orphans = jobs.reconcileOrphans();

  const runner = (job, quote) => {
    // Detached on purpose: the caller already has a 202.
    Promise.resolve()
      .then(async () => {
        jobs.update(job.id, { status: STATUS.RUNNING, progress: { pct: 5, message: 'accepted' } });
        const onProgress = async (pct, message) => {
          jobs.update(job.id, { progress: { pct: pct ?? 0, message: message || 'rendering' } });
        };
        try {
          const out = await runGenerateImpl(job, onProgress, { env, ledger, outDir: cfg.outDir, now });
          jobs.update(job.id, {
            status: STATUS.SUCCEEDED,
            backendId: out.promptId || null,
            progress: { pct: 100, message: 'succeeded' },
            output: {
              filename: out.filename,
              bytes: out.bytes,
              mime: out.mime,
              localPath: out.localPath,
              sha256: out.sha256 ?? null,
              attribution: out.attribution,
              provenance: out.provenance,
            },
          });
        } catch (err) {
          jobs.update(job.id, {
            // A moderation rejection is the vendor's word and is carried through
            // rather than flattened into `failed` — a different conversation.
            status: err.code === 'E_NSFW' ? STATUS.NSFW : STATUS.FAILED,
            error: { code: err.code || 'E_FAILED', message: err.message, retryable: err.permanent !== true },
            progress: { pct: 0, message: 'failed' },
          });
        }
      })
      .catch((err) => {
        // The runner must never reject into nothing. A detached promise with no catch
        // is how a failed job stays non-terminal forever.
        //
        // AND THE CATCH ITSELF MUST NOT REJECT. Every `jobs.update` above can throw:
        // `writeFileSync` on a full disk or a read-only volume, or `E_STORE_CORRUPT` from
        // the store's own refusal to read a file it cannot parse. When the store is the
        // thing that failed, the first update throws, this catch runs, and its update
        // throws AGAIN — out of a detached promise, where nothing is listening. Node's
        // default policy turns an unhandled rejection into a process exit, so a
        // bookkeeping fault would take down every other in-flight render with it.
        //
        // The job stays non-terminal and the next boot's `reconcileOrphans` marks it
        // failed with `E_ORPHANED`, which is the weaker claim this gateway already
        // prefers over inventing an outcome. The process survives, which is the point.
        try {
          jobs.update(job.id, {
            status: STATUS.FAILED,
            error: { code: err.code || 'E_RUNNER', message: err.message, retryable: false },
          });
        } catch (storeErr) {
          console.error(`[media-api] the runner could not record the failure of job ${job.id}: `
            + `${storeErr.message}. The job is left non-terminal; the next boot reconciles it.`);
        }
      });
  };

  const ctx = { env, ledger, jobs, quotes, runner, now, principal: 'owner' };

  /**
   * The request handler, split out of the listener so the listener can catch EVERY
   * rejection. An unhandled rejection in a request listener takes the whole process
   * down, which turns any malformed input into a remote kill switch.
   */
  async function handle(req, res) {
    let path;
    try {
      // `req.headers.host` is attacker-controlled, and Node's HTTP parser is more
      // permissive than WHATWG URL. A Host of `127.0.0.1:99999999`, `:8080`, `a b` or
      // `[::1` parses fine as a header and then THROWS here — and this line used to sit
      // outside the try, so the throw escaped the listener and killed the process.
      // Unauthenticated, because it happened before the token check.
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      path = url.pathname.replace(/\/$/, '') || '/';
    } catch {
      // Deliberately does not echo the Host back. A reflected header is a second bug.
      return send(res, 400, fail(400, 'E_BAD_HOST', 'The Host header is not a valid authority.').body);
    }

    if (!authorized(req, cfg.token)) {
      // No detail about WHICH part failed. A caller with the right token never sees
      // this; a caller without it learns nothing.
      return send(res, 401, fail(401, 'E_UNAUTHORIZED', 'Missing or invalid bearer token.').body);
    }

    const route = matchRoute(req.method, path);
    if (!route) return send(res, 404, fail(404, 'E_NO_ROUTE', `No route for ${req.method} ${path}.`).body);

    const body = req.method === 'POST' ? await readBody(req) : {};

    // Astra: `Idempotency-Key` is REQUIRED on job creation, and a replay returns the
    // existing job rather than submitting a second paid request.
    if (route.handler === createJob) {
      const key = String(req.headers['idempotency-key'] || '').trim();
      if (!key) {
        return send(res, 400, fail(400, 'E_NO_IDEMPOTENCY_KEY',
          'POST /v1/jobs requires an Idempotency-Key header. Without it a retried request is '
          + 'indistinguishable from a second one, and a second one on a priced route costs money.').body);
      }
      const existing = jobs.list().find(j => j.idempotencyKey === key && j.owner === ctx.principal);
      // Same shape as the first call's 202. A replay is not a lesser answer.
      if (existing) return send(res, 202, { job: publicJob(existing) });
      route.extra = { idempotencyKey: key };
    }

    const out = route.handler({ ...ctx, id: route.id, body });

    if (out.stream) {
      res.writeHead(200, { 'content-type': out.stream.mime, 'content-length': out.stream.bytes });
      const file = createReadStream(out.stream.path);
      // A readable stream with no 'error' listener THROWS, and an uncaught throw in a
      // request listener is a process kill. The artifact can vanish between the stat and
      // the open, or be a directory: `existsSync` is true, `statSync().size` is a number,
      // and `createReadStream` then emits EISDIR into nothing. Found by pointing a job's
      // `localPath` at a directory — the route looked correct on the page.
      file.on('error', () => res.destroy());
      file.pipe(res);
      return undefined;
    }
    if (route.extra?.idempotencyKey && out.status === 202 && out.body?.job?.id) {
      jobs.update(out.body.job.id, { idempotencyKey: route.extra.idempotencyKey });
    }
    return send(res, out.status, out.body);
  }

  const server = createServer((req, res) => {
    handle(req, res).catch((err) => {
      // The last line of defence. Nothing below may throw: if the response is already
      // gone there is nobody to answer, and trying anyway would reject into the very
      // hole this catch exists to close.
      if (res.headersSent || res.writableEnded || res.destroyed) return res.destroy();
      const status = err.code === 'E_BODY_TOO_LARGE' ? 413 : err.code === 'E_BAD_JSON' ? 400 : 500;
      // A 500's message is an INTERNAL error's message, and internal errors name paths
      // (`E_STORE_CORRUPT` names the store file). That goes to the operator's stderr,
      // not to the caller. The caller gets the code and nothing to map the deployment
      // with.
      if (status === 500) {
        console.error(`[media-api] ${err.code || 'E_INTERNAL'}: ${err.message}`);
        return send(res, 500, fail(500, err.code || 'E_INTERNAL',
          'The gateway failed to handle this request. The detail is in the server log.').body);
      }
      // A 413 is answered while the client may still be transmitting the body it was
      // told was too large. `connection: close` tells it to stop and drop the socket
      // rather than wait for a keep-alive that will never take more input.
      const extra = status === 413 ? { connection: 'close' } : {};
      try { send(res, status, fail(status, err.code || 'E_INTERNAL', err.message).body, extra); }
      catch { res.destroy(); }
    });
  });

  server.on('listening', () => {
    const addr = server.address();
    // Printed from the SOCKET, not from config. A config value that says 127.0.0.1
    // while the socket says otherwise is exactly the kind of confident lie this repo
    // writes tests against.
    console.log(`[media-api] listening on http://${addr.address}:${addr.port} (out=${cfg.outDir})`);
    if (cfg.nonLoopbackAcknowledged) {
      console.error('[media-api] ⚠ NON-LOOPBACK BIND ACKNOWLEDGED. The bearer token is now the only '
        + 'control between the network and a GPU with no authentication of its own.');
    }
    if (orphans.length) console.log(`[media-api] reconciled ${orphans.length} orphaned job(s): ${orphans.join(', ')}`);
  });

  return { server, cfg, jobs, quotes, ledger, ctx };
}

/** Route table lives in `router.mjs`; re-exported so existing imports keep working. */
export { matchRoute };

export function start(env = process.env) {
  const { server, cfg } = buildServer({ env });
  server.listen(cfg.port, cfg.host);
  return server;
}

export { ConfigError, authorized, randomUUID };
