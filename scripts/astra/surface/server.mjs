#!/usr/bin/env node
/**
 * server.mjs — the Astra surface. Loopback only, one process, no framework.
 *
 * WHY NO FRAMEWORK. The whole surface is 10 routes and one static directory. A
 * dependency here would be a supply-chain surface on a process that can rewrite a
 * tuning config, for no capability this needs. `node:http` plus a routing table is
 * smaller than the config to configure a framework.
 *
 * LOOPBACK IS ENFORCED BY `core/bind.mjs`, NOT BY A CONVENTION. `bindAddress()`
 * refuses anything that is not a literal `127.0.0.1` or `::1`, and refuses
 * `localhost` too — it is a NAME resolved through the hosts file, and a hosts entry
 * can point it at a LAN address. The refusal exits non-zero rather than warning.
 *
 * THE MUTATION TOKEN IS A COOKIE WITH `SameSite=Strict`, AND ALSO ACCEPTED AS A
 * HEADER. `SameSite=Strict` means a cross-site page cannot make the browser send it,
 * which is the CSRF defence; the header form exists so a test and a non-browser
 * client can present it without a cookie jar. `T-I-10` requires a mutation without
 * the token to be a 401 — and the token check runs BEFORE the handler, so a 501 from
 * an unbuilt slice cannot be reached without one.
 *
 * BOUNDS: reads `scripts/astra/static/`, `scripts/design-brain/config/`, the shared
 * compiler and `docs/`. Writes NOTHING. The one state change this slice can make is
 * an outcome on an in-memory compile, which does not survive a restart.
 *
 * Run:  node scripts/astra/surface/server.mjs [--port 7411] [--print-token]
 */

import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, normalize, resolve as resolvePath, sep } from 'node:path';

import { ASTRA_ROOT, DEFAULT_PORT, LOOPBACK_HOST, TASTE_PROBE_ORIGIN, TUNING_PATH, repoRelative } from '../core/paths.mjs';
import { bindAddress, assertLoopback } from '../core/bind.mjs';
import { readBrainVersion } from '../core/brain.mjs';
import { readTuning, flattenTuning } from '../core/tuning.mjs';
import { previewStaged } from '../core/tuningPreview.mjs';
import { layout, stateDenied } from './shell.mjs';
import { renderCompose, renderThink, renderNotBuilt } from './panes.mjs';
import { renderTune } from './paneTune.mjs';
import { handleApi, slotsFromBrief } from './api.mjs';

const STATIC_ROOT = join(ASTRA_ROOT, 'static');
const TOKEN_COOKIE = 'astra_token';
const BODY_MAX = 256 * 1024;

/** Routes that change something. Everything else is a read. */
const MUTATION_ROUTES = Object.freeze([
  'compile', 'reject', 'preview', 'tuning-stage', 'tuning-commit', 'tuning-revert',
]);

/** API routes that are POST-only. A GET on one is a method error, not a 404. */
const POST_ONLY = Object.freeze(['directions', 'compile', 'reject', 'preview',
  'tuning-stage', 'tuning-commit', 'tuning-revert']);

const json = (res, status, body, headers = {}) => {
  const text = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(text);
};

const html = (res, status, text, headers = {}) => {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(text);
};

/** Bounded body read. A request that never ends must not hold the process open. */
function readBody(req) {
  return new Promise((res) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > BODY_MAX) { req.destroy(); res({ __tooLarge: true }); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) { res({}); return; }
      try { res(JSON.parse(raw)); } catch { res({ __badJson: true }); }
    });
    req.on('error', () => res({ __badJson: true }));
  });
}

const cookieToken = (req) => {
  const raw = req.headers.cookie ?? '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === TOKEN_COOKIE) return decodeURIComponent(v.join('='));
  }
  return null;
};

/**
 * Serve one static file, or null.
 *
 * The traversal guard resolves the joined path and requires it to still be inside
 * `STATIC_ROOT` after `normalize`. Comparing string prefixes on the raw path would
 * admit `..%2f` once something decoded it.
 */
function serveStatic(pathname, res) {
  const rel = pathname.replace(/^\/static\/?/, '');
  if (!rel) return false;
  const abs = resolvePath(join(STATIC_ROOT, normalize(rel)));
  if (abs !== STATIC_ROOT && !abs.startsWith(STATIC_ROOT + sep)) {
    json(res, 403, { error: { code: 'E_STATIC_ESCAPE', message: 'path escapes the static root' } });
    return true;
  }
  if (!existsSync(abs)) return false;
  const ext = abs.slice(abs.lastIndexOf('.'));
  const type = ext === '.css' ? 'text/css' : (ext === '.js' ? 'text/javascript' : 'application/octet-stream');
  const buf = readFileSync(abs);
  res.writeHead(200, { 'content-type': `${type}; charset=utf-8`, 'content-length': buf.length });
  res.end(buf);
  return true;
}

/** Build the request handler. Exported so a test can drive it without a socket. */
export function createHandler({ token, state = { brief: {}, directions: null, lastCompileId: null, staged: {}, note: '', lastCommit: null } }) {
  return async (req, res) => {
    const url = new URL(req.url, `http://${LOOPBACK_HOST}`);
    const pathname = url.pathname;
    const method = req.method ?? 'GET';
    const brainVersion = readBrainVersion();

    if (pathname === '/healthz') { json(res, 200, { ok: true, brainVersion }); return; }

    if (pathname.startsWith('/static/')) {
      if (serveStatic(pathname, res)) return;
      json(res, 404, { error: { code: 'E_STATIC_MISSING', message: pathname } });
      return;
    }

    if (pathname.startsWith('/api/')) {
      const route = pathname.slice('/api/'.length).replace(/\//g, '-');
      const presented = req.headers['x-astra-token'] ?? cookieToken(req);
      if (MUTATION_ROUTES.includes(route) && presented !== token) {
        json(res, 401, {
          error: {
            code: presented ? 'E_TOKEN_INVALID' : 'E_TOKEN_REQUIRED',
            message: 'this is a write; the console needs the mutation token. '
              + 'It is set as a SameSite=Strict cookie on the pane routes and also accepted '
              + `as the ${'x-astra-token'} header.`,
          },
        });
        return;
      }
      if (POST_ONLY.includes(route) && method !== 'POST') {
        json(res, 405, { error: { code: 'E_METHOD', message: `${route} is POST only` } });
        return;
      }
      const body = method === 'POST' ? await readBody(req) : {};
      if (body.__tooLarge) {
        json(res, 413, { error: { code: 'E_BODY_TOO_LARGE', message: `body exceeds ${BODY_MAX} bytes` } });
        return;
      }
      if (body.__badJson) {
        json(res, 400, { error: { code: 'E_BAD_JSON', message: 'request body is not valid JSON' } });
        return;
      }
      const out = handleApi(route, { method, body, state });
      json(res, out.status, out.body);
      return;
    }

    // --- Panes -------------------------------------------------------------
    // The cookie is set on every pane response, so a browser gets the token before
    // it can reach a mutation. `HttpOnly` is deliberately NOT set: the client script
    // reads it to send the header form, and the CSRF defence is `SameSite=Strict`,
    // not the script's inability to read its own token.
    const setToken = { 'set-cookie': `${TOKEN_COOKIE}=${token}; SameSite=Strict; Path=/` };
    const shell = (title, activePane, body) => html(res, 200,
      layout({ title, activePane, brainVersion, body, note: tasteNote() }), setToken);

    if (pathname === '/' || pathname === '/choose') {
      shell(pathname === '/' ? 'Compose' : 'Choose', pathname === '/' ? 'compose' : 'choose',
        renderCompose({
          brief: state.brief,
          directions: state.directions,
          slots: slotsFromBrief(state.brief),
        }));
      return;
    }

    if (pathname.startsWith('/think')) {
      const id = pathname.slice('/think'.length).replace(/^\//, '') || state.lastCompileId;
      let view = null; let error = null;
      if (id) {
        try { view = (await import('../core/session.mjs')).getCompile(id).view; }
        catch (e) { error = { code: e.code ?? 'E_EXPLAIN', message: e.message }; }
      }
      shell('Think', 'think', renderThink({ view, compileId: id, error }));
      return;
    }

    if (pathname === '/law') { shell('Law', 'law', renderNotBuilt('Law', 'A5',
      'The lane board is built and code-sourced; the pane that renders it is not.')); return; }
    if (pathname === '/state') { shell('State', 'state', renderNotBuilt('State', 'A5',
      'The capability board is built and code-sourced; the pane that renders it is not.')); return; }
    if (pathname === '/tune') {
      // The pane reads the LIVE config on every request (AC4.1) — never a cached copy, so
      // an external edit to tuning.json shows up on the next refresh with no code change.
      let body;
      try {
        const flat = flattenTuning(readTuning());
        const staged = state.staged ?? {};
        body = renderTune({
          current: flat,
          staged,
          note: state.note ?? '',
          lastCommit: state.lastCommit ?? null,
          preview: Object.keys(staged).length ? previewStaged({ staged }) : null,
          path: repoRelative(TUNING_PATH),
        });
      } catch (e) {
        // A corrupt config renders as a NAMED error in the pane, not a 500 (T-M-01).
        body = renderTune({ error: { code: e.code ?? 'E_TUNING', message: e.message } });
      }
      shell('Tune', 'tune', body);
      return;
    }
    if (pathname === '/ledger') { shell('Ledger', 'ledger', renderNotBuilt('Ledger', 'A6',
      'The rejected-all trend and cost drift arrive with A6.')); return; }

    html(res, 404, layout({
      title: 'Not found', activePane: null, brainVersion,
      body: stateDenied({ message: `no route ${pathname}` }),
    }), setToken);
  };
}

/** The taste brain's absence is DEGRADED, not fatal — it is never required to run. */
function tasteNote() {
  return `taste brain: ${TASTE_PROBE_ORIGIN} (optional — Astra reads /api/profile at most and never writes taste)`;
}

/**
 * Start the surface. Throws `E_NOT_LOOPBACK` / `E_BAD_PORT` before listening, so a
 * bad bind never produces a running server that merely warned.
 *
 * `port: 0` means "let the OS choose a free port" and is handled HERE rather than by
 * relaxing `bindAddress()`. That guard is right to refuse 0: its contract is to
 * return a URL you can connect to, and `http://127.0.0.1:0/` is not one. What a test
 * needs is a different question — "bind wherever is free" — so it gets a different
 * path. Loopback is still enforced on both, with no test-only exemption: that is the
 * one guard in this file that must not have one.
 */
export async function startServer({ port = DEFAULT_PORT, host = LOOPBACK_HOST, token } = {}) {
  const bindHost = assertLoopback(host);
  const listenPort = port === 0 ? 0 : bindAddress({ host, port }).port;
  const theToken = token ?? randomBytes(32).toString('hex');
  const server = createServer(createHandler({ token: theToken }));
  await new Promise((res, rej) => {
    server.once('error', rej);
    server.listen(listenPort, bindHost, res);
  });
  const { port: actualPort } = server.address();
  const literal = bindHost.includes(':') ? `[${bindHost}]` : bindHost;
  return {
    server,
    port: actualPort,
    host: bindHost,
    token: theToken,
    url: `http://${literal}:${actualPort}/`,
    close: () => new Promise((res) => server.close(res)),
  };
}

const invokedDirectly = process.argv[1]
  && process.argv[1].replace(/\\/g, '/').endsWith('/scripts/astra/surface/server.mjs');

if (invokedDirectly) {
  const argv = process.argv.slice(2);
  const portArg = argv.indexOf('--port');
  const port = portArg === -1 ? DEFAULT_PORT : Number(argv[portArg + 1]);
  try {
    const s = await startServer({ port });
    process.stdout.write(`ASTRA — Design Brain Console\n  ${s.url}\n`);
    if (argv.includes('--print-token')) process.stdout.write(`  token: ${s.token}\n`);
    process.stdout.write(`  brainVersion ${readBrainVersion()} · loopback only\n`);
    process.on('SIGINT', () => { s.close().then(() => process.exit(0)); });
  } catch (e) {
    // Named, and non-zero. A refused bind must not look like a started server.
    process.stderr.write(`${e.code ?? 'E_BIND'}: ${e.message}\n`);
    process.exit(1);
  }
}
