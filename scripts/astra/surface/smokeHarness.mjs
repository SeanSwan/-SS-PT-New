/**
 * smokeHarness.mjs — the HTTP plumbing behind `smoke.mjs`.
 *
 * A SIBLING MODULE RATHER THAN AN ADDITION TO smoke.mjs, which reached 335 of Rule 4's
 * 300 lines when A4 added the tuning routes. The seam is PLUMBING versus CHECKS: this
 * file knows how to make a request, parse it, and record a verdict; `smoke.mjs` knows
 * what each route is supposed to answer. A4 needed to add four checks and should not
 * have had to add lines to the request layer to do it.
 *
 * NOTHING HERE IS A TEST. `smoke.mjs` boots a real server on a real loopback port and
 * prints one line per route, because a person reading one screen of output is the thing
 * a test suite is bad at. This module exists so that screen stays readable.
 *
 * THREE TRAPS ARE ENCODED HERE, each of which produced a check that PASSED for the wrong
 * reason before it was fixed — see `stripComments`, `rawGet`, and the token sentinel:
 *
 *   - `stripComments` — the overflow scan matched the stylesheet's own comment saying
 *     "no `overflow-x: hidden` anywhere", so a scan read a declaration as the thing
 *     declared. (Same class as A2's D11/D12 and A3's D20.)
 *   - `rawGet` — the traversal check used `fetch`, which normalises `..` away before
 *     anything is sent, so it tested the URL parser rather than the server.
 *   - the token sentinel — `undefined` meant both "send no token" and "not specified",
 *     so the check labelled "NO token" sent a valid one and passed a 200.
 */

import { connect } from 'node:net';

/** Comments stripped, so a scan cannot fire on prose that DESCRIBES the forbidden thing. */
export const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** A traversal must go over a raw socket: `fetch` removes `..` before it is ever sent. */
export function rawGet(port, path) {
  return new Promise((resolve) => {
    const sock = connect(port, '127.0.0.1', () => {
      sock.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`);
    });
    let out = '';
    sock.on('data', (d) => { out += d; });
    sock.on('close', () => resolve(out));
    sock.on('error', () => resolve('ERROR'));
  });
}

/**
 * Build the request/verdict helpers for one server instance.
 *
 * The token argument is a THREE-WAY switch, not a boolean, and that is the fix for the
 * trap above: `'good'` sends the real token, `'wrong'` sends a valid-shaped token that
 * is not the one, and `'none'` sends NO token header at all. A default of `undefined`
 * made the last two indistinguishable.
 */
export function createHarness({ base, port, token }) {
  const rows = [];

  const call = async (method, path, { body, token: which = 'good', raw = false } = {}) => {
    if (raw) {
      const text = await rawGet(port, path);
      const status = Number(/HTTP\/1\.1 (\d{3})/.exec(text)?.[1] ?? 0);
      return { status, parsed: null, text, headers: new Map() };
    }
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (which === 'good') headers['x-astra-token'] = token;
    if (which === 'wrong') headers['x-astra-token'] = 'definitely-not-the-token';
    if (which === 'none') { /* deliberately no header */ }
    const res = await fetch(base + path, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    return { status: res.status, parsed, text, headers: res.headers };
  };

  /** Run one check, never let it throw out of the runner, and record its verdict. */
  const check = async (name, fn) => {
    let note = '';
    let status = 0;
    let code = null;
    try {
      const r = await fn();
      status = r.status ?? 0;
      code = r.code ?? null;
      note = r.note ?? '';
    } catch (e) {
      note = `check threw: ${e.message}`;
    }
    rows.push({ name, ok: note === '', status, code, note });
  };

  const expect = (got, want, label) => (got === want ? '' : `${label} ${got}, expected ${want}`);

  return { call, check, expect, rows };
}

/** Print the one-screen report. Returns the process exit code. */
export function report({ rows, base, brainVersion, verbose = false }) {
  const failed = rows.filter((r) => !r.ok).length;
  const width = Math.max(...rows.map((r) => r.name.length));
  console.log(`astra smoke — ${base}`);
  console.log(`brainVersion ${brainVersion} · ${rows.length} checks\n`);
  for (const r of rows) {
    console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.name.padEnd(width)}  ${String(r.status).padEnd(3)}${r.code ? ` ${r.code}` : ''}`);
    if (verbose && r.note) console.log(`        ${r.note}`);
  }
  console.log(`\n${rows.length - failed} passed, ${failed} failed`);
  return failed === 0 ? 0 : 1;
}
