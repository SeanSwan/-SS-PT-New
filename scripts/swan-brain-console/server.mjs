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
 *   - GET only. There is no write route, no POST handler, and no engine mutation.
 *   - Serves a fixed allowlist of assets. No path from the request reaches the
 *     filesystem, so path traversal is structurally impossible rather than filtered.
 *   - The learning engine is fail-closed by design, so the console REPORTS that
 *     state instead of offering controls that could not work (see engineState.mjs).
 *
 * Run: node scripts/swan-brain-console/server.mjs [--port 4599] [--open]
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEngineState } from './engineState.mjs';
import { loadFleet } from './fleetData.mjs';
import { readDoctrine } from './doctrine.mjs';
import { readCopyPack } from './copyPack.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const ASSETS = join(HERE, 'app');
const HOST = '127.0.0.1';

/**
 * Host header values this server will answer to. A rebound request carries the
 * attacker's hostname, so anything outside this list is refused before routing.
 */
const ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];

/** Asset allowlist. The request path selects a KEY, never a file path. */
const ASSET_ROUTES = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/app.css': { file: 'app.css', type: 'text/css; charset=utf-8' },
  '/app.js': { file: 'app.js', type: 'text/javascript; charset=utf-8' },
  '/onboard.css': { file: 'onboard.css', type: 'text/css; charset=utf-8' },
  '/onboard.js': { file: 'onboard.js', type: 'text/javascript; charset=utf-8' },
};

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** Build the full read-only snapshot. Every number is computed here, at read time. */
async function snapshot() {
  const fleet = await loadFleet();
  return {
    generatedAt: new Date().toISOString(),
    engine: readEngineState(REPO),
    fleet,
    doctrine: readDoctrine(REPO),
    copy: readCopyPack(REPO, fleet.rows.map((r) => r.id)),
  };
}

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

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${HOST}`);
  const path = url.pathname;

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
   * The check is cheap, so it is checked FIRST, before any route work.
   */
  const hostHeader = String(req.headers.host ?? '');
  if (!ALLOWED_HOSTS.some((h) => hostHeader === h || hostHeader.startsWith(`${h}:`))) {
    json(res, 403, { error: 'host not allowed', hint: `expected one of ${ALLOWED_HOSTS.join(', ')}` });
    return;
  }

  // Read-only by construction: anything that is not GET is refused.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { error: 'read-only surface', method: req.method });
    return;
  }

  if (path === '/api/state') {
    try {
      json(res, 200, await snapshot());
    } catch (err) {
      json(res, 500, { error: 'snapshot failed', detail: String(err && err.message) });
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

const port = Number(argValue('--port', '4599'));
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('[console] invalid --port; expected 1024-65535');
  process.exit(2);
}

server.listen(port, HOST, () => {
  const url = `http://${HOST}:${port}/`;
  console.log(`[console] Swan Brain Console running at ${url}`);
  console.log('[console] read-only · localhost only · GET only · no engine writes');
  if (process.argv.includes('--open')) {
    console.log(`[console] open this URL in a browser: ${url}`);
  }
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n[console] ${sig} — shutting down.`);
    server.close(() => process.exit(0));
  });
}
