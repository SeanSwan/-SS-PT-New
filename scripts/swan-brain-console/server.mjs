#!/usr/bin/env node
/**
 * Swan Brain Console — zero-dependency local operator surface.
 * @module scripts/swan-brain-console/server
 *
 * WHAT THIS IS
 * One local URL where the Design Brain's doctrine, the 20-variant Three.js fleet,
 * the tournament canvases, the copy gate and the learning engine's real state are
 * visible together. It exists because design work otherwise happens across a dozen
 * CLIs and the repo, with no single place to judge it.
 *
 * WHY node:http AND NOT REACT (v1 fence)
 * The surviving precedent for an operator tool in this repo (`swan-taste-brain/prompter`)
 * is a plain `node:http` server with per-tab modules and no build step. It runs with
 * no GPU, no network, and nothing to install, which is what an operator tool should
 * cost. The console is NOT part of the product bundle and is NOT an admin route.
 *
 * SECURITY POSTURE (what this server refuses to do)
 *   - Binds 127.0.0.1 only. It is never reachable off the machine.
 *   - GET and HEAD only. HEAD is deliberate — it returns no body. There is no write route,
 *     no POST handler, and no engine mutation.
 *
 *     ⚠ THIS BLOCK USED TO SAY "GET only" WHILE THE CODE ALLOWED HEAD (round 5, 2026-09-19).
 *     A false statement in a security-posture list is the same drift class that hid a real
 *     bug here once already: the Host check's comment claimed it ran first while `new URL()`
 *     sat above it, so a malformed target hung instead of returning 403 (found by Astra).
 *     Treat every claim below as something to re-measure, not to quote.
 *
 *   - ASSET_ROUTES is a fixed allowlist in which the request path selects a KEY and is never
 *     concatenated into a file path, so traversal is structurally impossible THERE.
 *   - The REGISTRY route is the one place a request-derived string reaches the filesystem:
 *     `readRegistry` does `join(assetsDir, name + '.json')`. It is safe for two independent
 *     reasons, and the older blanket claim of "structurally impossible" was only ever true of
 *     ASSET_ROUTES: the name must equal one of REGISTRY_NAMES, AND the resolved path is
 *     re-checked against the asset root. Do not delete the second check as redundant — it is
 *     what keeps the property true if the allowlist is ever edited carelessly.
 *   - The learning engine is fail-closed by design, so the console REPORTS that
 *     state instead of offering controls that could not work (see engineState.mjs).
 *
 * Run: node scripts/swan-brain-console/server.mjs [--port 4599] [--open]
 */
import { createServer } from 'node:http';
import { bootServer } from './serverBoot.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
/*
 * ROUND 8 (2026-09-20): the five individual readers used to be imported here because
 * `snapshot()` was defined in this file. The snapshot now lives in `./snapshot.mjs` — one
 * implementation shared with the MCP surface — so this module imports the snapshot and
 * nothing else. Leaving the readers imported would be five dead imports and, worse, would
 * let a future edit re-create a private second copy without noticing.
 */
import { snapshot } from './snapshot.mjs';
import { ASSET_ROUTES } from './assetRoutes.mjs';
/* ROUND 12: the Host predicate and the registry name list moved out — see those modules.
 * Importing `buildIdentity` is what computes the process fingerprint, at load (Astra F15). */
import { ALLOWED_HOSTS, hostAllowed } from './hostGuard.mjs';
import { REGISTRY_KINDS } from './app/registry-kinds.mjs';
import { serveBuildIdentity } from './buildIdentity.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
/*
 * `REPO` used to be resolved here for `snapshot()`. Round 8 moved that function to
 * `./snapshot.mjs`, which resolves the root itself from its own location, so this file no
 * longer needs — or should hold — a second opinion about where the repo is.
 */
const ASSETS = join(HERE, 'app');
const HOST = '127.0.0.1';

/*
 * The only methods this surface answers — one source for BOTH the gate and the startup
 * banner, which is why the banner takes no copy of the fact and needs no test of its own.
 *
 * ROUND 7 (2026-09-20): the banner printed "GET only" while the gate allowed HEAD, and HEAD
 * returns 200. Round 5 corrected that same claim in the module HEADER and missed this one,
 * so the false statement survived in the only place an operator actually reads it, on every
 * start. Deriving both from this list makes the drift unreachable, not merely corrected.
 */
export const ALLOWED_METHODS = Object.freeze(['GET', 'HEAD']);

/* `ALLOWED_HOSTS` and its predicate MOVED to `./hostGuard.mjs` (round 12); re-exported below. */

/*
 * `ASSET_ROUTES` MOVED to `./assetRoutes.mjs` (S4). The table is security-relevant DATA —
 * the request path selects a key and is never concatenated into a file path — and adding
 * the Gate Health route pushed this file to 308 lines against Rule 4's 300-line budget.
 * The split is by subject: this module keeps routing, request validation and the registry
 * reader; that module is only the allowlist. It is re-exported at the foot of this file so
 * the existing tests and `registry-route.test.mjs` keep importing it from here.
 */

/**
 * Registry allowlist (ruled D16). A separate namespace from ASSET_ROUTES so that the
 * asset map keeps its "path selects a key" property while the registries become
 * reachable. The name is validated against this list — there is no path
 * concatenation and no globbing, so traversal is structurally impossible rather than
 * filtered. `../` cannot survive the allowlist check even if it survived the regex.
 *
 * ROUND 12: the list itself moved to `./app/registry-kinds.mjs`, which the BROWSER imports
 * too, so it is one object rather than two literals a test compared (Astra F19).
 */
const REGISTRY_NAMES = REGISTRY_KINDS;

/* `argValue` used to live here. Round 7 moved the only caller — `--port` parsing — into
 * `serverBoot.mjs`, where it is `parsePort` and can be tested without a socket. */

/** Build the full read-only snapshot.
 *
 * ROUND 8 (2026-09-20): this function used to be DEFINED here, and `mcp/tools.mjs` had a
 * second copy of the same five reads. Both claimed to be "identical in shape"; they were
 * not, because `gates` was added here in S4.1 and not there. The implementation now lives
 * in `./snapshot.mjs`, which BOTH surfaces import — so the claim holds by construction.
 * The `gates` rationale moved with it. */

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  });
  res.end(payload);
}

/**
 * Read one registry from disk, uncached.
 *
 * EXPORTED SO D4 CAN BE PROVEN. "Registries are read at request time" is a claim about
 * *when* a file is read, and a claim about timing cannot be tested through a route that
 * has already read it once — nor by mutating a real registry mid-test. Exporting the
 * reader lets the test point it at a throwaway directory, change the file between two
 * calls, and observe the change. The route above calls this same function, so the test
 * covers the code path the server actually uses.
 *
 * Three failure modes are returned as values rather than thrown: an unlisted name (the
 * allowlist), a missing file, and invalid JSON. Each maps to a distinct HTTP status in
 * the route, so an operator can tell a typo from a corrupt file.
 */
export function readRegistry(name, assetsDir = ASSETS) {
  if (!REGISTRY_NAMES.includes(name)) {
    return { ok: false, error: 'unknown registry', allowed: [...REGISTRY_NAMES] };
  }
  const file = join(assetsDir, `${name}.json`);
  // Belt-and-braces canonical-root check. The allowlist already makes traversal
  // impossible; this keeps that true even if the allowlist is later edited carelessly.
  if (!resolve(file).startsWith(resolve(assetsDir) + sep)) {
    return { ok: false, error: 'registry path escaped the asset root' };
  }
  if (!existsSync(file)) return { ok: false, error: 'registry file missing', file: `${name}.json` };
  try {
    return { ok: true, value: JSON.parse(readFileSync(file, 'utf8')) };
  } catch (err) {
    return { ok: false, error: 'registry is not valid JSON', detail: String(err && err.message) };
  }
}

const server = createServer(async (req, res) => {
  /*
   * Host allowlist — closes DNS rebinding.
   *
   * Binding to 127.0.0.1 does NOT protect a read endpoint: a page at evil.com can
   * rebind its own hostname to 127.0.0.1, at which point the browser treats requests
   * to it as SAME-ORIGIN and happily returns the JSON. The server answered regardless
   * of the Host header, so repo metadata was readable by any web page while the
   * console ran.
   *
   * This was disclosed in three consecutive review rounds and left unfixed, which is
   * its own kind of defect: a known one-line hole, named repeatedly and never closed.
   *
   * IT NOW RUNS GENUINELY FIRST. It did not, until round 2: `new URL()` sat above this
   * block, so a malformed request target (e.g. `http://[`) threw ERR_INVALID_URL out of
   * an async handler and the request received NO response at all — a silent hang rather
   * than a 403. The comment claimed the check was "checked FIRST, before any route work"
   * while the code parsed the URL first: doc-vs-code drift in the one guard whose entire
   * value is being unskippable. Falsified by Astra (gpt-6-astra), 2026-09-19.
   *
   * ROUND 12: the PREDICATE moved to `./hostGuard.mjs` and was narrowed there. Inline it read
   * `hostHeader.startsWith(`${h}:`)`, which accepts any text after the colon — `Host:
   * localhost:bad-port` returned 200 (Astra F21). The ordering this comment is about is unchanged.
   */
  if (!hostAllowed(req.headers.host)) {
    json(res, 403, { error: 'host not allowed', hint: `expected one of ${ALLOWED_HOSTS.join(', ')}` });
    return;
  }

  /*
   * Only now is it safe to parse. A malformed target is a bounded 400, not a rejected
   * promise: an async handler that throws answers nothing, and a silent hang is worse
   * than an error because the operator cannot distinguish it from a slow server.
   *
   * The target is deliberately NOT echoed back — it is attacker-controlled, and this is
   * a JSON response the browser will render.
   */
  let url;
  try {
    url = new URL(req.url ?? '/', `http://${HOST}`);
  } catch {
    json(res, 400, { error: 'malformed request target' });
    return;
  }
  const path = url.pathname;

  // Read-only by construction: anything outside ALLOWED_METHODS is refused. The list is
  // shared with the startup banner, so the claim an operator reads cannot drift from this.
  if (!ALLOWED_METHODS.includes(req.method)) {
    json(res, 405, { error: 'read-only surface', method: req.method });
    return;
  }

  // Astra F15: what code this PROCESS loaded — not what is on disk now. See buildIdentity.mjs.
  if (serveBuildIdentity(path, res, json)) return;

  if (path === '/api/state') {
    try {
      json(res, 200, await snapshot());
    } catch (err) {
      json(res, 500, { error: 'snapshot failed', detail: String(err && err.message) });
    }
    return;
  }

  /*
   * Registries (ruled D16). Read from disk ON EVERY REQUEST — never cached, so adding
   * a row and reloading the page is enough and no restart is needed (D4). A cache here
   * would silently serve a stale registry, which is precisely the decay this console
   * exists to make visible.
   */
  const registryMatch = /^\/registry\/([a-z-]+)\.json$/.exec(path);
  if (registryMatch) {
    const name = registryMatch[1];
    const out = readRegistry(name, ASSETS);
    if (out.ok) json(res, 200, out.value);
    else if (out.error === 'unknown registry') {
      json(res, 404, {
        error: out.error, path, name, allowed: out.allowed,
      });
    } else {
      json(res, 500, { error: out.error, name, detail: out.detail });
    }
    return;
  }

  const asset = ASSET_ROUTES[path];
  if (!asset) {
    json(res, 404, { error: 'not found', path, allowed: Object.keys(ASSET_ROUTES) });
    return;
  }

  const file = join(ASSETS, asset.file);
  if (!existsSync(file)) {
    json(res, 500, { error: 'asset missing', file: asset.file });
    return;
  }
  const body = readFileSync(file);
  res.writeHead(200, {
    'content-type': asset.type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'content-security-policy': [
      "default-src 'none'",
      "style-src 'self'",
      "script-src 'self'",
      "connect-src 'self'",
      "img-src 'self' data:",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join('; '),
  });
  res.end(req.method === 'HEAD' ? undefined : body);
});

/**
 * Start only when this file is the entry point.
 *
 * Importing the module — which the S3 registry tests do, to reach `readRegistry` — must
 * NOT open a listening socket. Without this guard, merely importing the server would
 * bind port 4599, and a test run would either collide with a console the operator
 * already has open or silently occupy the port and look like a hang.
 */
const isEntryPoint = Boolean(process.argv[1])
  && import.meta.url === pathToFileURL(process.argv[1]).href;

/*
 * How the console starts — port parsing, the startup banner, signal handling — lives in
 * `serverBoot.mjs`. The banner takes the method list as an argument rather than restating
 * it, so it cannot disagree with the gate below; see that module's header for the round-7
 * finding that made this worth separating.
 */
if (isEntryPoint) {
  const port = bootServer({ server, host: HOST, methods: ALLOWED_METHODS });
  if (port === null) process.exit(2);
}

/* Re-exported because the definitions moved but this module's surface must not change. */
export { server, ASSET_ROUTES, REGISTRY_NAMES, ALLOWED_HOSTS };
