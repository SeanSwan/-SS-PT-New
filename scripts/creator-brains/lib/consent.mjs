#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/consent.mjs
 * PURPOSE: The interactive half of the OAuth lane — loopback callback, bounded
 *          wait, cancel, state verification, and the code exchange.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR10)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * THE I/O IS INJECTED SO THE FLOW'S LOGIC IS TESTABLE WITHOUT A BROWSER.
 *
 *   `createServer` and `openUrl` are parameters. In production they are
 *   `node:http` and a platform browser launch; in tests they are a fake server
 *   and a no-op that drives the callback directly. That is what makes
 *   "first consent / cancel / timeout" testable at all, and the packet's
 *   acceptance list explicitly asks for all three.
 *
 * WHY A LOOPBACK SERVER AND NOT A COPY-PASTED CODE:
 *   The desktop OAuth flow redirects to `http://127.0.0.1:<port>`. Anything else
 *   (a manual copy-paste redirect, a custom scheme) either needs a registered
 *   redirect URI the owner must maintain, or it puts the authorization code
 *   through the clipboard. Loopback keeps the code on the machine and needs no
 *   extra Google configuration beyond "Desktop app".
 *
 * BOUNDS, ALWAYS:
 *   - the wait has a timeout and is cancellable via an AbortSignal;
 *   - `state` is verified before the code is exchanged, so a stray request to
 *     the loopback port cannot complete the flow;
 *   - the server closes on EVERY exit path, including a throw. A leaked listener
 *     on a fixed port is how the second attempt fails with EADDRINUSE.
 *
 * @module creator-brains/consent
 */

import { createServer as createHttpServer } from 'node:http';
import { execFile } from 'node:child_process';
import { OAuthError, buildAuthUrl, exchangeCode, makePkce, makeState, DEFAULT_CONSENT_TIMEOUT_MS } from './oauth.mjs';

/**
 * Open a URL in the owner's default browser.
 *
 * Best-effort and platform-aware; a failure is NOT fatal because the consent URL
 * is also printed, so the owner can paste it. Refusing to continue because a
 * launcher is missing would be the tool being precious about a convenience.
 */
export function openInBrowser(url, { platform = process.platform, spawn = execFile } = {}) {
  const [cmd, args] = platform === 'win32'
    ? ['cmd', ['/c', 'start', '', url]]
    : platform === 'darwin'
      ? ['open', [url]]
      : ['xdg-open', [url]];
  return new Promise((resolve) => {
    try {
      spawn(cmd, args, { windowsHide: true }, (err) => resolve({ ok: !err, error: err ? err.message : null }));
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

/** The reply the browser shows. Deliberately terse and content-free. */
const PAGE = '<!doctype html><meta charset="utf-8"><title>Creator Brains</title>'
  + '<body style="font:16px system-ui;padding:3rem;background:#0a0a0f;color:#e0ecf4">'
  + '<h1 style="font-size:1.2rem">Authorization {RESULT}</h1>'
  + '<p>You can close this tab and return to the terminal.</p>';

const reply = (res, result, code = 200) => {
  res.writeHead(code, { 'content-type': 'text/html; charset=utf-8' });
  res.end(PAGE.replace('{RESULT}', result));
};

/**
 * Run the full interactive consent flow.
 *
 * @param openUrl  `(url) => void | Promise<void>` — opens the consent page.
 * @param createServer  injected for tests; defaults to `node:http`.
 * @param signal   an AbortSignal for owner-driven cancel.
 * @returns `{ ok, tokens }` or `{ ok: false, reason, cancelled }`.
 */
export async function runConsentFlow({
  clientId, clientSecret, scope, openUrl, fetchImpl,
  timeoutMs = DEFAULT_CONSENT_TIMEOUT_MS,
  now = Date.now(),
  createServer = createHttpServer,
  signal = null,
  onWaiting = null,
} = {}) {
  if (!clientId || !clientSecret) throw new OAuthError('clientId and clientSecret are required');
  if (typeof openUrl !== 'function') throw new OAuthError('openUrl must be a function');
  if (typeof fetchImpl !== 'function') throw new OAuthError('a fetch implementation is required');

  const pkce = makePkce();
  const state = makeState();

  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    let port = 0;

    const server = createServer((req, res) => {
      let url;
      try {
        url = new URL(req.url, `http://127.0.0.1:${port}`);
      } catch {
        reply(res, 'failed', 400);
        return;
      }
      if (!url.pathname.startsWith('/callback')) { reply(res, 'not found', 404); return; }

      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      const gotState = url.searchParams.get('state');

      // STATE FIRST. A request without our state did not come from our consent
      // page, and exchanging its code would complete a flow we did not start.
      if (gotState !== state) {
        reply(res, 'rejected (state mismatch)', 400);
        return; // do NOT settle: the real callback may still arrive
      }
      if (error) {
        reply(res, `denied (${error})`, 200);
        settle({ ok: false, cancelled: error === 'access_denied', reason: `consent denied: ${error}` });
        return;
      }
      if (!code) {
        reply(res, 'failed (no code)', 400);
        settle({ ok: false, reason: 'callback carried no authorization code' });
        return;
      }

      const redirectUri = `http://127.0.0.1:${port}/callback`;
      exchangeCode({
        code, verifier: pkce.verifier, clientId, clientSecret, redirectUri, fetchImpl, now,
      }).then((tokens) => {
        reply(res, 'received');
        settle({ ok: true, tokens });
      }).catch((e) => {
        reply(res, 'failed', 500);
        settle({ ok: false, reason: e.message, errorKind: e.detail && e.detail.kind });
      });
    });

    const closeServer = () => new Promise((done) => {
      try { server.close(() => done()); } catch { done(); }
      // `close` waits for open connections; the browser keeps one alive.
      setTimeout(done, 250);
    });

    async function settle(result) {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
      await closeServer();
      resolve(result);
    }

    function onAbort() {
      settle({ ok: false, cancelled: true, reason: 'cancelled by the owner' });
    }

    server.on('error', (e) => {
      settle({ ok: false, reason: `could not start the loopback listener: ${e.message}` });
    });

    // Port 0 = let the OS pick a free port. A fixed port collides with whatever
    // else the owner is running, and the failure looks like a broken app.
    server.listen(0, '127.0.0.1', async () => {
      port = server.address().port;
      const redirectUri = `http://127.0.0.1:${port}/callback`;
      const url = buildAuthUrl({
        clientId, redirectUri, challenge: pkce.challenge, state, scope,
      });

      if (signal) {
        if (signal.aborted) { onAbort(); return; }
        signal.addEventListener('abort', onAbort, { once: true });
      }
      timer = setTimeout(() => {
        settle({ ok: false, timedOut: true, reason: `no consent within ${Math.round(timeoutMs / 1000)}s` });
      }, timeoutMs);

      if (onWaiting) onWaiting({ url, redirectUri, port });
      try {
        await openUrl(url);
      } catch (e) {
        settle({ ok: false, reason: `could not open the consent page: ${e.message}` });
      }
    });
  });
}
