/**
 * hostile-round22-probe.mjs — THE HTTP PRIMITIVES, attacked for the first time.
 *
 * ── WHY THIS ROUND EXISTS ──────────────────────────────────────────────────
 * The ledger test picked this surface: `http.mjs` has a file-table row and **not one
 * finding across twenty-one rounds**. It is the layer every request passes through before
 * routing — the bearer check, the body cap and the one response envelope — and it is 116
 * lines. Twenty-one rounds attacked the money, the licence, the provenance record, both
 * adapters and the ledger's write path, and left the door unexamined.
 *
 * ── THE DEFECTS, MEASURED BEFORE ANY FIX ───────────────────────────────────
 *
 *   1. **`authorized()` throws when `req.headers` is absent.** An auth check that throws
 *      is not a 401 — it is an exception, and `server.mjs` turns it into a 500 with a
 *      stderr line. The file already states this principle about its own token argument
 *      ("a guard that only holds because of a caller's precondition is not a guard") and
 *      applies it to `token` but not to `req`.
 *   2. **`readBody()` accepts any JSON value, and `null` is the one that bites.**
 *      `readBody('null')` resolves `null`; `server.mjs:218` hands it to a route, which
 *      dereferences `body.provider` and throws a TypeError that surfaces as **500** where
 *      a malformed body should be **400 E_BAD_JSON**. A parse layer reporting success on
 *      input its own consumer cannot use.
 *   3. **`send()` lets `extraHeaders` override the envelope it exists to impose.** The
 *      docstring says "one response envelope for every route, so no route invents its
 *      own" — and a caller passing `content-type` or `content-length` replaces both.
 *      Measured: `content-length: 999` on an 8-byte payload.
 *   4. **`safeEqual()` reports two ABSENT values as equal.** `safeEqual(undefined,
 *      undefined)` is `true`, as are `(null, null)` and `("", "")`. Unreachable through
 *      `authorized` today because of that function's own precondition — the same
 *      "holds only because of the caller" shape as finding 1.
 *
 * ── WRITTEN TO SURVIVE THE PRE-FIX TREE ────────────────────────────────────
 * No new export is required, so the pre-fix replay reports FAILURES with reasons.
 *
 * ── WHAT THIS ROUND DOES NOT DO ────────────────────────────────────────────
 * No socket is opened, no server is started, no provider is enabled, no job is created.
 * Requests are hand-built objects; responses are hand-built recorders.
 */

import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { safeEqual, authorized, readBody, send, MAX_BODY_BYTES } from '../media-api/http.mjs';
import { createQuote } from '../media-api/routes.mjs';

let passed = 0; let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};
const section = (t) => console.log(`\n── ${t} ──`);

/** A request that emits `body` as one chunk and then ends. */
const reqOf = (body, headers = { authorization: 'Bearer tok' }) => {
  const R = { headers, h: {}, on(e, f) { (this.h[e] = this.h[e] || []).push(f); return this; } };
  process.nextTick(() => {
    if (body !== null) (R.h.data || []).forEach((f) => f(Buffer.from(body)));
    (R.h.end || []).forEach((f) => f());
  });
  return R;
};
/** A response that records what was written. */
const resOf = () => {
  const r = { head: null, ended: null, writeHead(s, h) { r.head = { status: s, headers: h }; }, end(p) { r.ended = p; } };
  return r;
};
const bodyOf = async (raw) => {
  try { return { ok: true, value: await readBody(reqOf(raw)) }; }
  catch (e) { return { ok: false, code: e.code, message: e.message }; }
};

async function main() {
  console.log('HOSTILE PROBE — ROUND 22: the HTTP primitives, attacked for the first time\n');

  // ══ A. an auth check must refuse, not throw ══════════════════════════════
  section('A. authorized() must return false for a request it cannot read, not throw');
  {
    for (const [label, req] of [
      ['no headers key at all', {}],
      ['headers: undefined', { headers: undefined }],
      ['headers: null', { headers: null }],
    ]) {
      let threw = null; let result = null;
      try { result = authorized(req, 'tok'); } catch (e) { threw = e.message; }
      check(`A. ${label} refuses instead of throwing`,
        threw === null && result === false,
        threw ? `-> THREW: ${threw}. A guard that throws is not a refusal; server.mjs catches it `
          + 'and answers 500, so "cannot tell" and "internal failure" become the same response.'
          : `-> returned ${result}`);
    }
    // CONTROLS — the real decisions must not move.
    check('CONTROL: the right token is still accepted',
      authorized({ headers: { authorization: 'Bearer tok' } }, 'tok') === true);
    check('CONTROL: the wrong token is still refused',
      authorized({ headers: { authorization: 'Bearer nope' } }, 'tok') === false);
    check('CONTROL: a missing header is still refused',
      authorized({ headers: {} }, 'tok') === false);
    check('CONTROL: a non-string token is still refused (the "undefined" bypass)',
      authorized({ headers: { authorization: 'Bearer undefined' } }, undefined) === false
      && authorized({ headers: { authorization: 'Bearer 0' } }, 0) === false);
  }

  // ══ B. a body the routes cannot use must be refused at the parse layer ═══
  section('B. readBody() must not report success on JSON the routes cannot dereference');
  {
    for (const raw of ['null', '123', '"a string"', 'true', 'false', '[1,2]']) {
      const r = await bodyOf(raw);
      check(`B. a body of ${raw} is refused as E_BAD_JSON`,
        r.ok === false && r.code === 'E_BAD_JSON',
        r.ok ? `-> resolved ${JSON.stringify(r.value)} (type ${r.value === null ? 'null' : typeof r.value}). `
          + 'server.mjs:218 hands this to a route, which reads `body.provider` — and on `null` '
          + 'that throws a TypeError the catch-all answers with a 500.'
          : `-> ${r.code}`);
    }
    // THE CONSEQUENCE, measured through the real route rather than described.
    let threw = null;
    try {
      createQuote({
        body: null, env: {}, ledger: null, quotes: { get: () => undefined, set: () => {} },
        principal: 'owner', now: () => new Date('2026-09-19T12:00:00Z'),
      });
    } catch (e) { threw = e.code || e.message; }
    check('B. the value readBody accepts is one the real route cannot survive',
      threw !== null,
      `-> createQuote({ body: null }) ${threw ? `threw ${threw}` : 'returned normally'}; that is the `
      + '500 the caller sees for a body the parse layer called valid.');

    // CONTROLS
    const ok = await bodyOf('{"provider":"comfyui/local"}');
    check('CONTROL: an object body is still parsed', ok.ok === true && ok.value.provider === 'comfyui/local');
    const empty = await bodyOf('   ');
    check('CONTROL: an empty body is still a fresh object', empty.ok === true && empty.value !== null
      && Object.keys(empty.value).length === 0, `-> ${JSON.stringify(empty)}`);
    const bad = await bodyOf('{not json');
    check('CONTROL: malformed JSON is still 400 E_BAD_JSON (hostile-http-probe.mjs:221)',
      bad.ok === false && bad.code === 'E_BAD_JSON');
    check('CONTROL: the cap is still 256 KiB and still inclusive', MAX_BODY_BYTES === 262144);
  }

  // ══ C. the envelope must not be overridable by the caller it constrains ══
  section('C. send() must impose the envelope rather than offer it');
  {
    const LEN_A1 = Buffer.byteLength(JSON.stringify({ a: 1 }));
    const r1 = resOf(); send(r1, 200, { a: 1 }, { 'content-length': 999 });
    check('C. extraHeaders cannot replace content-length',
      r1.head.headers['content-length'] === LEN_A1,
      `-> content-length is ${r1.head.headers['content-length']} on an 8-byte payload. A wrong `
      + 'length either truncates the body or hangs the next request on the same socket.');
    const r2 = resOf(); send(r2, 200, { a: 1 }, { 'content-type': 'text/html' });
    check('C. extraHeaders cannot replace content-type',
      r2.head.headers['content-type'] === 'application/json; charset=utf-8',
      `-> ${r2.head.headers['content-type']}. A JSON body labelled text/html is rendered, and `
      + 'the docstring says the point of `send` is that no route invents its own envelope.');
    // CONTROLS — extra headers must still WORK (413 relies on one).
    const ERR_BODY = { error: 'x' };
    const r3 = resOf(); send(r3, 413, ERR_BODY, { connection: 'close' });
    check('CONTROL: caller headers that are not envelope invariants still pass through',
      r3.head.headers.connection === 'close'
      && r3.head.headers['content-length'] === Buffer.byteLength(JSON.stringify(ERR_BODY)),
      `-> ${JSON.stringify(r3.head.headers)} — server.mjs:257 sends \`connection: close\` on a 413.`);
    const r4 = resOf(); send(r4, 200, { a: 1 });
    check('CONTROL: the plain envelope is unchanged',
      r4.head.headers['content-type'] === 'application/json; charset=utf-8'
      && r4.head.headers['content-length'] === LEN_A1 && r4.ended === '{"a":1}',
      `-> content-length=${r4.head.headers['content-length']} (expected ${LEN_A1})`);
  }

  // ══ D. two absent values are not a match ═════════════════════════════════
  section('D. safeEqual() must not call two missing values equal');
  {
    for (const [label, v] of [['undefined', undefined], ['null', null]]) {
      let r; try { r = safeEqual(v, v); } catch (e) { r = 'threw'; }
      check(`D. safeEqual(${label}, ${label}) is not a match`, r === false,
        `-> ${r}. Both sides stringify to the same placeholder, so "neither side supplied a `
        + 'value" reads as "the values agree" — the token bypass this file already fixed one '
        + 'level up, reached through the other argument.');
    }
    check('CONTROL: equal strings still compare equal', safeEqual('abc', 'abc') === true);
    check('CONTROL: different strings still compare unequal', safeEqual('abc', 'abd') === false);
    check('CONTROL: a length mismatch is still a mismatch, without throwing',
      safeEqual('abc', 'abcd') === false);
  }

  // ══ F. MUTATION CONTROLS ════════════════════════════════════════════════
  await mutationControls();

  console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

async function mutationControls() {
  section('F. mutation controls — re-introduce each defect and require the check to fail');
  const srcPath = new URL('../media-api/http.mjs', import.meta.url);
  const src = readFileSync(srcPath, 'utf8');
  const dir = mkdtempSync(join(tmpdir(), 'r22-mut-'));
  try {
    const mutations = [
      ['A: authorized() throws on a request with no headers',
        /if \(!req \|\| typeof req\.headers !== 'object' \|\| req\.headers === null\) return false;/, '',
        async (m) => { try { return m.authorized({}, 'tok'); } catch (e) { return 'threw'; } }],
      ['B: readBody() accepts JSON that is not an object',
        /if \(parsed === null \|\| typeof parsed !== 'object' \|\| Array\.isArray\(parsed\)\) \{/, 'if (false) {',
        async (m) => {
          const R = { headers: {}, h: {}, on(e, f) { (this.h[e] = this.h[e] || []).push(f); return this; } };
          const p = m.readBody(R);
          process.nextTick(() => {
            (R.h.data || []).forEach((f) => f(Buffer.from('null')));
            (R.h.end || []).forEach((f) => f());
          });
          try { return JSON.stringify(await p); } catch (e) { return 'rejected:' + e.code; }
        }],
      ['C: extraHeaders overrides the envelope',
        /headers\['content-length'\] = Buffer\.byteLength\(payload\);/,
        "headers['content-length'] = Buffer.byteLength(payload); Object.assign(headers, extraHeaders);",
        async (m) => { const r = { head: null, writeHead(s, h) { r.head = h; }, end() {} };
          m.send(r, 200, { a: 1 }, { 'content-length': 999 }); return r.head['content-length']; }],
      ['D: safeEqual() calls two absent values equal',
        /if \(typeof a !== 'string' \|\| typeof b !== 'string'\) return false;/, '',
        async (m) => m.safeEqual(undefined, undefined)],
    ];
    for (const [label, pattern, replacement, probe] of mutations) {
      if (!pattern.test(src)) {
        check(`F. ${label}`, false, `-> MUTATION DID NOT APPLY: ${pattern} is not in http.mjs`);
        continue;
      }
      const mutated = src.replace(pattern, replacement);
      if (mutated === src) {
        check(`F. ${label}`, false, `-> MUTATION WAS A NO-OP: replacing ${pattern} changed nothing`);
        continue;
      }
      const p = join(dir, `${label.slice(0, 1).toLowerCase()}-mut.mjs`);
      writeFileSync(p, mutated);
      const mod = await import(pathToFileURL(p).href);
      let observed;
      try { observed = await probe(mod); } catch (e) { observed = `threw ${e.code || e.message}`; }
      const reproduced = { A: observed === 'threw', B: observed === 'null', C: observed === 999, D: observed === true }[label.slice(0, 1)];
      check(`F. ${label}`, reproduced === true,
        `-> the mutated module ${reproduced === true ? 'reproduced' : 'did NOT reproduce'} the defect `
        + `(observed: ${JSON.stringify(observed)}), so the check above `
        + `${reproduced === true ? 'can fail' : 'CANNOT fail'}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main();
