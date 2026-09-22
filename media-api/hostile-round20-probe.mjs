/**
 * hostile-round20-probe.mjs — THE HOSTED ADAPTER, attacked for the first time.
 *
 * ── WHY THIS ROUND EXISTS ──────────────────────────────────────────────────
 * Nineteen rounds have attacked the money gates, the licence gate, the record, the wire and — in
 * rounds 18 and 19 — the LOCAL adapter. **`higgsfield.mjs` and `higgsfieldTransport.mjs` have never
 * been attacked**: the ledger has a row for each and not one finding. That is the same shape as
 * round 18's gap, and this is the surface where a mistake costs real money rather than GPU time.
 *
 * ── THE DEFECTS, MEASURED BEFORE ANY FIX ───────────────────────────────────
 *
 *   1. **`verify()` reported "credential accepted" for answers that prove nothing about the
 *      credential.** The probe is a status GET for a non-existent request id; the code treats any
 *      status that is not 401/403 as proof the credential works. So a **500**, a **429** and a
 *      **302** all produced `ok: true` with the detail "host reachable, credential accepted (probe
 *      answered 500)". `verify()` exists to be the first command run on a machine that is not set
 *      up, and it answered YES on the strength of the vendor failing. Round 18's finding 1, in the
 *      other adapter.
 *   2. **`poll()` treats every non-ok response as a blip, so a rejected credential becomes a
 *      fifteen-minute timeout** — and the timeout message asserts *"The request may still be
 *      running and billing"*, which the code never established. With a wrong key the request is
 *      not billing; it is unpollable, and the job's whole attempt budget is spent discovering that.
 *      Round 19's finding 4, in the lane that spends money.
 *   3. **The credential's destination has no scheme check.** `SWAN_HIGGSFIELD_URL` is used verbatim,
 *      so a base URL of `http://` sends `Authorization: Key <id>:<secret>` in cleartext — to the
 *      vendor's own documented instruction that credentials stay out of anything observable.
 *   4. **The artifact URL is fetched with no validation at all.** `findArtifactUrl` returns a string
 *      out of the vendor's response body and `generate()` issues a server-side GET to it and writes
 *      the bytes to disk. Measured: `http://169.254.169.254/latest/meta-data/` is fetched. Nothing
 *      checks the scheme, so the response body chooses what this process requests.
 *
 * ── WRITTEN TO SURVIVE THE PRE-FIX TREE ────────────────────────────────────
 * Every check drives the real `verify()` / `generate()` through a stub `fetchImpl`, so the pre-fix
 * replay reports FAILURES with reasons rather than dying on a missing export.
 *
 * ── WHAT THIS ROUND DOES NOT DO ────────────────────────────────────────────
 * **No live call.** Nothing here reaches `api.higgsfield.ai`: every request goes to a stub, and the
 * base URL used in every fixture is a test host. No provider is enabled and no job is created.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  verify, generate, resolveConfig, redactSecrets,
} from '../shared/providers/video/higgsfield.mjs';
import { statusFor } from './wire.mjs';
import { isPermanentCode } from '../backend/scripts/handlers/generateVideo.mjs';

let passed = 0; let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};
const section = (t) => console.log(`\n── ${t} ──`);
const throws = async (fn) => { try { await fn(); return null; } catch (e) { return e.code || e.message; } };
const catchErr = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };

const dir = mkdtempSync(join(tmpdir(), 'r20-probe-'));
const REQ = { prompt: 'a swan crossing still water at dawn', category: 'marketing', style: 'cinematic', duration: 6 };
const ENV = {
  HIGGSFIELD_API_KEY_ID: 'kid', HIGGSFIELD_API_KEY_SECRET: 'supersecretvalue',
  SWAN_HIGGSFIELD_PATH_MINIMAX_H3: 'minimax/h3',
};
const GOOD = { ...ENV, SWAN_HIGGSFIELD_URL: 'https://api.example' };

/** A stub that RECORDS every request, so "the credential left the process" is measurable. */
const stub = (handler) => {
  const calls = [];
  const impl = (url, init) => { calls.push({ url: String(url), headers: (init || {}).headers || {} }); return handler(String(url), init); };
  impl.calls = calls;
  return impl;
};
const okJson = (body) => ({ ok: true, status: 200, json: async () => body });
const reqs = (status, body = {}) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });

/** submit ok, poll terminal-completed CARRYING `artifactUrl`, and the artifact itself at that URL. */
const happy = (artifactUrl, extra = {}) => stub((url) => {
  if (url.includes('/status')) return okJson({ status: 'completed', video: { url: artifactUrl }, ...extra });
  if (url === artifactUrl) return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('hosted-bytes') };
  return okJson({ status: 'queued', request_id: 'r1', status_url: 'https://api.example/requests/r1/status', cancel_url: 'https://api.example/requests/r1/cancel' });
});
/**
 * ── ROUND 27: THE GATE NOW PRECEDES EVERY CHECK IN THIS FILE ────────────────
 * F2 put `resolve()` at the top of `generate()`, so an un-enabled row refuses with
 * `E_PROVIDER_DISABLED` before `resolveConfig`, the wire, the poll loop or the artifact guard is
 * reached — which is every subject this probe has. Measured before the fix: section B failed with
 * `actual: 'E_PROVIDER_DISABLED'` against expected poll-timeout codes, section C failed the same
 * way, and one path escaped as an UNCAUGHT throw that killed the run at 32 checks in.
 *
 * The enablement and the two request facts are therefore supplied HERE, in one place, and every
 * check keeps the assertion it already had. Nothing in this file asserts the gate's refusal —
 * that is round 26's E5/E5b/E5c and round 27's C1–C4 — so nothing is weakened by not re-asserting
 * it. The env is spread so a caller's own overrides still win, which matters for the cleartext
 * base-URL check that deliberately passes a different URL.
 */
const run = (env, fetchImpl, name = 'out.mp4', opts = {}) =>
  generate(REQ, {
    env: { SWAN_VIDEO_PROVIDERS_ENABLED: 'higgsfield/minimax-h3', ...env },
    fetchImpl, outPath: join(dir, name), sleep: async () => {}, timeoutMs: 40,
    commercial: false, explicitSelection: true, ...opts,
  });

async function main() {
  console.log('HOSTILE PROBE — ROUND 20: the hosted adapter, attacked for the first time\n');

  // ══ A. verify() answered YES on the strength of the vendor failing ═══════
  section('A. verify() called the credential "accepted" for answers that prove nothing');
  {
    for (const status of [500, 503, 429, 302, 301]) {
      const report = await verify(GOOD, { fetchImpl: async () => ({ ok: false, status }), providerId: 'higgsfield/minimax-h3' });
      const c = report.checks.find(x => x.name === 'host + credential');
      check(`A. a ${status} from the probe does NOT prove the credential was accepted`,
        c.ok === false,
        `-> ok=${c.ok}, "${c.detail}". A 5xx/429/3xx is the vendor failing or redirecting; the API `
        + 'never reached a decision about the credential.');
    }
    const report = await verify(GOOD, { fetchImpl: async () => ({ ok: false, status: 500 }), providerId: 'higgsfield/minimax-h3' });
    const c = report.checks.find(x => x.name === 'host + credential');
    check('A. ...and the detail does not CLAIM acceptance',
      !/credential accepted/i.test(c.detail),
      `-> ${JSON.stringify(c.detail)}`);
    check('A. ...and the report as a whole is not ok', report.ok === false);

    // CONTROLS — the two answers that DO mean something must keep meaning it.
    const four = await verify(GOOD, { fetchImpl: async () => ({ ok: false, status: 404 }), providerId: 'higgsfield/minimax-h3' });
    const fc = four.checks.find(x => x.name === 'host + credential');
    check('CONTROL: a 404 still counts as accepted (auth passed, host answering)',
      fc.ok === true, `-> ok=${fc.ok}, "${fc.detail}" — the vendor 404s an unknown request id, so a 404 `
      + 'is a decision made AFTER authentication.');
    const denied = await verify(GOOD, { fetchImpl: async () => ({ ok: false, status: 401 }), providerId: 'higgsfield/minimax-h3' });
    check('CONTROL: a 401 is still reported as rejected, without printing the secret (media-api.test.mjs:406)',
      denied.checks.find(x => x.name === 'host + credential').ok === false
      && /credential was rejected/.test(JSON.stringify(denied))
      && !/supersecretvalue/.test(JSON.stringify(denied)));
  }

  // ══ B. a rejected credential became a fifteen-minute timeout ═════════════
  section('B. poll() turned a rejected credential into a timeout that asserts billing');
  {
    const rejected = stub((url) => (url.includes('/status')
      ? reqs(401, { detail: 'invalid key' })
      : okJson({ status: 'queued', request_id: 'r1', status_url: 'https://api.example/requests/r1/status' })));
    const err = await catchErr(() => run(GOOD, rejected, 'b.mp4'));
    check('B. a credential the status endpoint REJECTS does not become E_TIMEOUT',
      err?.code === 'E_POLL_REJECTED',
      `-> ${err?.code}. A 401 is the same answer on every poll, so fifteen minutes of polling cannot `
      + 'change it — and the job spends its whole attempt budget learning that.');
    check('B. ...and the refusal names the status the vendor returned',
      /401/.test(err?.message || ''),
      `-> ${JSON.stringify((err?.message || '').slice(0, 150))}`);
    check('B. ...and it does NOT claim the request is still running and billing',
      !/running and billing/i.test(err?.message || ''),
      `-> ${JSON.stringify((err?.message || '').slice(0, 150))}`);

    const flaky = stub((url) => (url.includes('/status')
      ? reqs(502, { detail: 'bad gateway' })
      : okJson({ status: 'queued', request_id: 'r1', status_url: 'https://api.example/requests/r1/status' })));
    const to = await catchErr(() => run(GOOD, flaky, 'c.mp4'));
    check('B. a status endpoint that never answers honestly produces a timeout that says so',
      to?.code === 'E_TIMEOUT' && /502/.test(to?.message || '') && /poll/i.test(to?.message || ''),
      `-> ${JSON.stringify((to?.message || '').slice(0, 170))} — the code had observed 502s, not a `
      + 'queued job, so "may still be running and billing" was never established.');
    check('CONTROL: a status that simply never terminates keeps the billing warning',
      await (async () => {
        const never = stub((url) => (url.includes('/status')
          ? okJson({ status: 'in_progress' })
          : okJson({ status: 'queued', request_id: 'r1', status_url: 'https://api.example/requests/r1/status' })));
        const e = await catchErr(() => run(GOOD, never, 'd.mp4'));
        return e?.code === 'E_TIMEOUT' && /running and billing/i.test(e?.message || '');
      })(),
      'a request that IS still in_progress is genuinely still billable, so that sentence must stay');
  }

  // ══ C. the credential had no scheme check on its destination ═════════════
  section('C. the credential would travel in cleartext if the base URL said http://');
  {
    const http = stub(() => okJson({ status: 'queued', request_id: 'r1' }));
    const err = await catchErr(() => run({ ...ENV, SWAN_HIGGSFIELD_URL: 'http://api.example' }, http, 'e.mp4'));
    check('C. a configured provider refuses a non-https base URL',
      err?.code === 'E_INSECURE_BASE_URL',
      `-> ${err?.code}. Measured pre-fix: the request went out with `
      + `"${http.calls[0] ? JSON.stringify(http.calls[0].headers) : 'Authorization'}".`);
    check('C. ...and NOTHING left the process first',
      http.calls.length === 0,
      `-> ${http.calls.length} request(s) made. The whole point is that the header is never built for `
      + 'a cleartext destination.');
    check('C. ...and the refusal names the variable to fix',
      /SWAN_HIGGSFIELD_URL/.test(err?.message || ''),
      `-> ${JSON.stringify((err?.message || '').slice(0, 160))}`);
    check('CONTROL: https is unaffected',
      (await run(GOOD, happy('https://cdn.example/out.mp4'), 'f.mp4')).bytes > 0);
  }

  // ══ D. the response body chose what this process fetched ═════════════════
  section('D. the artifact URL was fetched with no validation');
  {
    const meta = 'http://169.254.169.254/latest/meta-data/';
    const f = happy(meta);
    const err = await catchErr(() => run(GOOD, f, 'g.mp4'));
    check('D. a non-https artifact URL is refused',
      err?.code === 'E_BAD_ARTIFACT_URL',
      `-> ${err?.code}. Pre-fix this issued a server-side GET to ${meta} and wrote the response to disk.`);
    check('D. ...and it was never fetched',
      !f.calls.some(c => c.url === meta),
      `-> requests made: ${f.calls.map(c => c.url).join(', ') || '(none)'}`);
    check('D. a relative or protocol-less artifact URL is refused too',
      (await throws(() => run(GOOD, happy('out.mp4'), 'h.mp4'))) === 'E_BAD_ARTIFACT_URL'
      && (await throws(() => run(GOOD, happy('file:///etc/passwd'), 'i.mp4'))) === 'E_BAD_ARTIFACT_URL');
    check('CONTROL: an https artifact on a DIFFERENT host still works (a CDN is legitimate)',
      (await run(GOOD, happy('https://cdn.other-host.example/out.mp4'), 'j.mp4')).bytes > 0,
      'this is the control that keeps the guard narrow: it checks the SCHEME, not the origin — an '
      + 'origin allowlist would refuse the vendor\'s own CDN, and a rule that refuses the normal case '
      + 'is broken, not fail-closed.');
  }

  // ══ E. what this round discloses instead of fixing ═══════════════════════
  section('E. DISCLOSURE');
  {
    check('DISCLOSURE: redactSecrets silently skips anything shorter than 6 characters',
      redactSecrets('the key is abcde', ['abcde']) === 'the key is abcde'
      && redactSecrets('the key is abcdef', ['abcdef']) === 'the key is <REDACTED>',
      'the threshold exists so a one-character secret cannot rewrite the whole message, but it is a '
      + 'SILENT policy: a credential under six characters is echoed in full into a thrown message. '
      + 'Real vendor secrets are long, so this is theoretical — stated rather than left to be '
      + 'discovered. Pinned so the threshold cannot move without this note being revisited.');
    check('DISCLOSURE: there is still no ORIGIN allowlist for the artifact URL',
      (await run(GOOD, happy('https://anything-at-all.example/x.mp4'), 'k.mp4')).bytes > 0,
      'the guard added above is https-only. The vendor may serve artifacts from a CDN, so an origin '
      + 'allowlist would be a guess about infrastructure this lane has never observed — and a wrong '
      + 'one refuses real artifacts. Recorded as a known limit, not as a protection.');
    const codes = ['E_POLL_REJECTED', 'E_INSECURE_BASE_URL', 'E_BAD_ARTIFACT_URL'];
    check('DISCLOSURE: the three new codes are mapped, and NONE is permanent — the set is the runner\'s',
      codes.every(c => typeof statusFor(c) === 'number' && statusFor(c) !== 400)
      && codes.every(c => isPermanentCode(c) === false),
      'all three are CONFIGURATION facts — a wrong key, a cleartext base URL, an artifact URL that '
      + 'cannot be trusted — so all three fail identically on every retry. PERMANENT_CODES lives in '
      + 'backend/scripts/handlers/generateVideo.mjs, which is Sean\'s call, so this round maps them '
      + 'and names the gap. This check FLIPS the day they are added.');
  }

  // ══ F. the contracts the existing suites pin must not move ═══════════════
  section('F. the contracts the existing suites pin');
  {
    const out = await run(GOOD, happy('https://api.example/out.mp4'), 'l.mp4');
    check('F. a completed request still returns the vendor\'s ids and its artifact',
      out.promptId === 'r1' && out.bytes > 0 && /^[0-9a-f]{64}$/.test(out.sha256)
      && out.vendorStatus === 'completed' && out.sourceUrl === 'https://api.example/out.mp4',
      `-> ${Object.keys(out).join(', ')}`);
    // ROUTED THROUGH `run` (round 27), so this check gets the same enablement and the same two
    // request facts as every other one. It used to call `generate` directly with a bare `env`,
    // which after F2 refused at the gate — the check then compared `E_PROVIDER_DISABLED` against
    // `E_SUBMIT_REJECTED` and failed for a reason that had nothing to do with the submit codes it
    // exists to pin.
    check('F. a 4xx submit is the request\'s fault; a 5xx is the moment\'s (media-api.test.mjs:436)',
      await throws(() => run(GOOD, async () => reqs(400), 'm.mp4')) === 'E_SUBMIT_REJECTED'
      && await throws(() => run(GOOD, async () => reqs(503), 'n.mp4')) === 'E_SUBMIT_FAILED');
    check('F. completed with no artifact URL is still E_NO_OUTPUT (media-api.test.mjs:443)',
      await throws(() => run(GOOD, happy('https://api.example/out.mp4', { video: null }), 'o.mp4')) === 'E_NO_OUTPUT');
    check('F. an nsfw terminal is still E_NSFW, carried through as the vendor\'s own word',
      await (async () => {
        const s = stub((url) => (url.includes('/status') ? okJson({ status: 'nsfw' }) : okJson({ status: 'queued', request_id: 'r1', status_url: 'https://api.example/requests/r1/status' })));
        return await throws(() => run(GOOD, s, 'p.mp4')) === 'E_NSFW';
      })());
    check('F. the credential is still redacted out of an echoed error body (SEC-001)',
      !/SUPERSECRET/.test(redactSecrets('{"detail":"Key abc:sk-live-SUPERSECRETVALUE"}', ['abc', 'sk-live-SUPERSECRETVALUE'])));
    check('F. the vendor\'s own status_url is still preferred over a hand-built one',
      (await (async () => {
        const j = await import('../shared/providers/video/higgsfield.mjs');
        const job = await j.submit(REQ, { baseUrl: 'https://api.example', keyId: 'k', keySecret: 's', modelPath: 'm', providerId: 'p', configured: true },
          async () => okJson({ request_id: 'r1', status_url: 'https://vendor-own.example/s/r1', cancel_url: 'https://vendor-own.example/c/r1' }));
        return job.statusUrl === 'https://vendor-own.example/s/r1';
      })()));
    check('F. resolveConfig still requires all three fields and still reads the suffixed override',
      (() => {
        const c = resolveConfig({ HIGGSFIELD_API_KEY_ID: 'a' }, 'higgsfield/minimax-h3');
        const d = resolveConfig({ ...GOOD, SWAN_HIGGSFIELD_PATH_KLING_3_0: 'kling/path' }, 'higgsfield/kling-3.0');
        return c.configured === false && d.modelPath === 'kling/path';
      })());
  }

  rmSync(dir, { recursive: true, force: true });
  console.log(`\n${passed + failed} CHECKS — ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main();
