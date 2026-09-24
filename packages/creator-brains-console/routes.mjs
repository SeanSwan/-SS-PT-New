/**
 * ============================================================================
 * FILE: packages/creator-brains-console/routes.mjs
 * PURPOSE: The console bridge's route table and its static fallback.
 * PART OF: Creator Brains Console (blueprint 05 §2, 08 Operations)
 * SLICE: S0
 * ============================================================================
 *
 * WHY THIS IS ITS OWN MODULE. `server.mjs` reached EXACTLY 300 lines — the
 * repo's hard cap (CLAUDE.md rule 4) with ZERO headroom — so every later change
 * to the bridge had to be shaped net-neutral to avoid breaching it. S1-H11's fix
 * (a named 404 for every non-API path) was written that way. At that point the
 * cap had stopped describing the code and started distorting it, and the seam to
 * split on was already named in `server.mjs`'s own docstring: this file owns the
 * ROUTE TABLE, `server.mjs` owns the process lifecycle. Nothing else moved.
 *
 * WHY THE ROUTE TABLE IS STILL LITERAL, AND MUST STAY THAT WAY. `HY4-H6` reads
 * this file as TEXT, extracts every `req.method === '…' && p === '…'` statement,
 * and compares the set against a declared allowlist — so adding a route without
 * editing that allowlist turns the suite red. That check is what makes R9 ("no
 * dangerous route may appear unnoticed") reviewable by a human instead of only
 * by whoever wrote the router. It only works while the statements stay regular,
 * which is why the shape below is load-bearing rather than stylistic: a router
 * object, a table of strings, or any dynamic dispatch would silently disable it.
 * If this table is ever refactored, `HY4-H6`'s extractor must be refactored with
 * it — and its `found.size >= allowlist.length` assertion is the tripwire for
 * exactly that mistake.
 *
 * NOTE THE ABSENCES. There is deliberately no route for restore, rollback,
 * authorize or verify-backup — blueprint R9 requires that a test can assert
 * their absence, and "absence" only means something if the table is exhaustive
 * and readable. T-B8 is the assertion; this comment is the review hook.
 *
 * WHAT THIS MODULE DOES NOT OWN. The Host check (the DNS-rebinding defence) and
 * the error envelope stay in `server.mjs`: both run OUTSIDE the route table, one
 * before it and one around it, and moving them here would hide the fact that the
 * Host gate cannot be bypassed by any route. `parseRequestUrl` also stays there,
 * because it must run inside `server.mjs`'s try — that placement is the S1-H8 fix
 * and is pinned by T-B18.
 *
 * @module creator-brains-console/routes
 */

import {
  statusInstrument, creatorRows, queryConsole, brainDoc, runState,
  canaryState, backlogData, addCreatorRow, setCreatorEnabled, repairStore, startDailyRun,
} from './api.mjs';
import { ApiError, CODE } from './lib/errors.mjs';
import { sendJson, readBody, resolveStatic, contentTypeFor, readStatic } from './lib/http.mjs';

/**
 * The status page shown when a static path resolves to nothing — either because
 * the web build is absent (before slice S1) or because the path is not a real
 * asset. A 404 here would read as a broken install; this says what is true.
 *
 * It is served with 200 on purpose, which is why a traversal test cannot assert
 * on the status code: an unresolved static path and a refused traversal are
 * indistinguishable from the outside. T-B24 asserts the path is COLLAPSED
 * instead. See 16 §18.
 */
const BRIDGE_PAGE = `<!doctype html><meta charset="utf-8"><title>Creator Brains Console</title>
<body style="font:16px/1.6 system-ui;background:#0A0A0F;color:#E0ECF4;padding:48px">
<h1>Creator Brains Console — bridge is up</h1>
<p>The data bridge is answering on <code>/api/*</code>.</p>
<p>The console UI is built in slice S1; until then this page is the bridge's own receipt.</p>
<ul>
<li><a style="color:#60C0F0" href="/api/status">/api/status</a></li>
<li><a style="color:#60C0F0" href="/api/creators">/api/creators</a></li>
<li><a style="color:#60C0F0" href="/api/run">/api/run</a></li>
</ul></body>`;

/**
 * Dispatch one already-Host-checked, already-parsed request.
 *
 * `url` is passed in rather than derived here so that `parseRequestUrl` keeps its
 * position inside `server.mjs`'s try block (S1-H8, T-B18). Throws `ApiError` for
 * anything unroutable; the caller's `catch` turns that into the envelope, which
 * is why this function never writes an error response itself.
 */
export async function dispatch(req, res, { r, url, reservation = null }) {
  const p = url.pathname;

  /* ── reads (tier T0) ── */
  if (req.method === 'GET' && p === '/api/status') return sendJson(res, 200, statusInstrument(r));
  if (req.method === 'GET' && p === '/api/creators') return sendJson(res, 200, creatorRows(r));
  if (req.method === 'GET' && p === '/api/run') {
    // D2/P1a: this read is also the HANDOFF ACKNOWLEDGEMENT. A run reservation
    // outlives the 202 that created it and is released on evidence that the
    // child owns the store — a journal run id this read has not seen before, or
    // a held lock. `GET /api/run` is exactly that evidence, and it is the route
    // the client already polls while waiting for a run, so the release costs no
    // extra request and no timer. See `lib/run-reservation.mjs`.
    const state = runState(r);
    if (reservation) reservation.noteRun(state);
    return sendJson(res, 200, state);
  }
  if (req.method === 'GET' && p === '/api/canary') return sendJson(res, 200, canaryState(r));
  if (req.method === 'GET' && p === '/api/backlog') return sendJson(res, 200, backlogData(r));
  if (req.method === 'GET' && p === '/api/query') {
    return sendJson(res, 200, queryConsole(url.searchParams.get('q'), {
      r, creator: url.searchParams.get('creator'),
    }));
  }
  if (req.method === 'GET' && p.startsWith('/api/brains/')) {
    return sendJson(res, 200, brainDoc(p.slice('/api/brains/'.length), { r }));
  }

  /* ── writes (tier T2 — bounded; delegate to the engine's own setters) ── */
  if (req.method === 'POST' && p === '/api/creators') {
    const body = await readBody(req);
    return sendJson(res, 201, await addCreatorRow(body.ref, { r }));
  }
  if (req.method === 'PATCH' && p.startsWith('/api/creators/')) {
    const id = p.slice('/api/creators/'.length);
    const body = await readBody(req);
    if (typeof body.enabled !== 'boolean') {
      throw new ApiError(CODE.VALIDATION, "'enabled' must be true or false");
    }
    return sendJson(res, 200, setCreatorEnabled(id, body.enabled, { r }));
  }

  /* ── operations (tier T2 — ONE shared exclusion gate, A1-06) ──
   * S3. `POST /api/repair` answers the PROJECTED engine result
   * `{repaired,built,emptied}` (05 §2b), and may answer `409 RUN_LOCKED {holder}`
   * when a run holds the store.
   * S4. `POST /api/run/daily` spawns the engine's scheduled entry point and
   * answers `202 {requestId, runId:null}` — ACCEPTANCE, not completion (A1-05),
   * with progress read from `GET /api/run`.
   *
   * Both take the SAME gate (`lib/run-gate.mjs`), because both reach `runDaily`
   * and therefore the same journal. The engine's repair path IS
   * `runDaily({only:[...]})`, so two separate gates would leave the journal
   * reachable through whichever door was gated less (A1-06).
   *
   * There is deliberately no `/api/backup`: A1-08 / D4 is still open, and the
   * contract says that route stays visible-but-blocked with NO endpoint. */
  if (req.method === 'POST' && p === '/api/repair') {
    return sendJson(res, 200, await repairStore({ r }));
  }
  if (req.method === 'POST' && p === '/api/run/daily') {
    const body = await readBody(req);
    // 202: the work is ACCEPTED, not done. The status code is part of the
    // contract's honesty, not a style choice — a 200 here would tell the client
    // the run finished.
    //
    // D2/P1a: the reservation is passed through, taken BEFORE the gate, and
    // released by `GET /api/run` above once the child owns the store. Without it
    // a second request in the spawn handoff window spawns a second child into
    // one store — measured, not inferred.
    return sendJson(res, 202, await startDailyRun({ r, perHour: body && body.perHour, reservation }));
  }

  /* ── anything else is a named 404; a static path is GET/HEAD only (H11) ── */
  if (p.startsWith('/api/') || (req.method !== 'GET' && req.method !== 'HEAD')) {
    throw new ApiError(CODE.NOT_FOUND, `no route for ${req.method} ${p}`);
  }

  /* ── static ── */
  const file = resolveStatic(p);
  if (!file) {
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    });
    return res.end(BRIDGE_PAGE);
  }
  res.writeHead(200, {
    'content-type': contentTypeFor(file),
    'cache-control': 'no-store',
  });
  return res.end(readStatic(file));
}
