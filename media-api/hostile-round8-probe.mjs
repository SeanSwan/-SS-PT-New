#!/usr/bin/env node
/**
 * hostile-round8-probe.mjs — the EIGHTH hostile pass. The one that has to be dry.
 *
 * Round 7 was supposed to be dry and was not: it found that `/v1/estimate` published a
 * four-decimal string and no integer, so a sub-precision cost was indistinguishable from
 * free in the field a caller reads first. Fixed. So the loop needs another pass, and this
 * one attacks what is left:
 *
 *   A. WHO is asking — the principal, and whether the isolation checks mean anything
 *   B. the body cap, at the EXACT boundary rather than comfortably over it
 *   C. the quote store's own semantics: expiry, pruning, ownership defaults
 *   D. the ORDER of the gates — a caller must learn the REAL reason first
 *   E. provenance completeness on the artifact record
 *
 * ── WHAT "DRY" MEANS HERE ───────────────────────────────────────────────────
 * Not "no checks failed" — a section of tautologies passes trivially. Dry means: every
 * section ran its control, every claim was falsifiable, and nothing new was found. Where a
 * finding is a SCOPE gap rather than a defect, it is recorded as a DISCLOSURE with the
 * reason, because silently "fixing" an unbuilt slice is how scope lies get shipped.
 */

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildServer } from './server.mjs';
import { MAX_BODY_BYTES } from './http.mjs';
import { makeQuoteStore, makeJobStore, STATUS } from './store.mjs';
import { preflight, SERVED_PROVIDERS, PreflightError } from './preflight.mjs';

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { fail += 1; failures.push(name); console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
}
function section(t) { console.log(`\n── ${t} ──`); }
const throws = (fn) => { try { fn(); return null; } catch (e) { return e.code || e.name; } };

const TOKEN = 'round8-token-0123456789abcdef';
const LOCAL_ID = 'comfyui/minimax-h3';
const root = mkdtempSync(join(tmpdir(), 'swan-media-round8-'));
const env = {
  SWAN_MEDIA_API_ROOT: root,
  SWAN_MEDIA_API_TOKEN: TOKEN,
  SWAN_VIDEO_PROVIDERS_ENABLED: LOCAL_ID,
  SWAN_VIDEO_MAX_RUNS_DAILY: '20',
  SWAN_VIDEO_MAX_SPEND_USD_DAILY: '0',
};

async function main() {
  console.log('HOSTILE PROBE — ROUND 8\n');

  const { server, ctx, jobs, quotes } = buildServer({ env, deps: { runGenerateImpl: async () => ({}) } });
  await new Promise((res, rej) => { server.once('error', rej); server.listen(0, '127.0.0.1', res); });
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    // ── A. who is asking ─────────────────────────────────────────────────────
    section('A. the principal — and whether the isolation checks are load-bearing');
    {
      check('CONTROL: the server exposes a principal to its routes',
        typeof ctx.principal === 'string' && ctx.principal.length > 0, `principal="${ctx.principal}"`);

      // The finding, stated plainly. `createJob` checks `quote.owner !== principal` and the
      // idempotency lookup filters `j.owner === ctx.principal`. Both are CORRECT code. Both are
      // VACUOUS, because the server hardcodes one principal for every request: the bearer token
      // authenticates the OPERATOR, not a caller. Two clients sharing the token are one principal.
      const src = readFileSync(new URL('./server.mjs', import.meta.url), 'utf8');
      check('DISCLOSURE: the principal is HARDCODED, so the API is single-tenant',
        /principal:\s*'owner'/.test(src),
        'every request is the same principal; owner-isolation is correct but unreachable');

      // Which means the isolation checks cannot be exercised over HTTP. They are still worth
      // having — they are what makes AUTH-002 a wiring job rather than a rewrite — so this is a
      // SCOPE gap, not a defect. Astra named it: per-caller opaque tokens and scopes (AUTH-002).
      const ownerIsolationPresent = /quote\.owner !== principal/.test(
        readFileSync(new URL('./routes.mjs', import.meta.url), 'utf8'));
      check('DISCLOSURE: owner-isolation IS implemented, and is what AUTH-002 will switch on',
        ownerIsolationPresent,
        'the check exists and is correct; nothing can reach it until a caller identity exists');

      // A token that authenticates the OPERATOR must not be presented as a caller identity.
      const res = await fetch(`${base}/v1/wallet`, { headers: { authorization: `Bearer ${TOKEN}` } });
      const body = await res.json();
      check('CONTROL: an authenticated read succeeds',
        res.status === 200, `${res.status}`);
      check('the wallet does not claim to be scoped to a caller',
        !('principal' in body) && !('caller' in body) && !('owner' in body),
        `fields: ${Object.keys(body).join(', ')}`);
    }

    // ── B. the body cap, at the EXACT boundary ───────────────────────────────
    section('B. the body cap is off-by-one-safe, and the refusal is deliverable');
    {
      const valid = JSON.stringify({ params: { provider: 'nope/does-not-exist' } });
      const pad = (n) => valid + ' '.repeat(n - valid.length);   // trailing space is valid JSON
      const post = async (raw) => {
        const r = await fetch(`${base}/v1/estimate`, {
          method: 'POST',
          headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
          body: raw,
        });
        return { status: r.status, body: await r.json().catch(() => null) };
      };

      check('CONTROL: the cap is a real number', Number.isInteger(MAX_BODY_BYTES) && MAX_BODY_BYTES > 1024,
        `${MAX_BODY_BYTES} bytes`);
      check('CONTROL: a small body is not refused', (await post(valid)).status !== 413,
        `status=${(await post(valid)).status}`);

      const atCap = await post(pad(MAX_BODY_BYTES));
      check('a body of EXACTLY the cap is accepted (not a 413)',
        atCap.status !== 413,
        `${MAX_BODY_BYTES} bytes -> ${atCap.status} ${atCap.body?.error?.code || ''}`);
      const overCap = await post(pad(MAX_BODY_BYTES + 1));
      check('a body ONE BYTE over the cap is refused with 413',
        overCap.status === 413 && overCap.body?.error?.code === 'E_BODY_TOO_LARGE',
        `${MAX_BODY_BYTES + 1} bytes -> ${overCap.status} ${overCap.body?.error?.code || ''}`);
      // The refusal must be READABLE, which was the whole point of the round-1 fix: destroying
      // the socket made the status unreachable. Getting a parsed body back proves it.
      check('the 413 is DELIVERABLE — the caller receives a parsed error envelope',
        overCap.body?.error?.message !== undefined,
        String(overCap.body?.error?.message).slice(0, 80));
    }

    // ── C. the quote store's own semantics ───────────────────────────────────
    section('C. the quote store: expiry, pruning, ownership defaults');
    {
      let clock = new Date('2026-09-18T12:00:00.000Z');
      const store = makeQuoteStore(join(root, 'quotes-probe.json'), { now: () => clock });
      const mk = (over = {}) => store.create({ provider: LOCAL_ID, params: {}, pricing: {}, ...over });

      check('CONTROL: the store creates and reads back a quote',
        store.get(mk().id) !== null);
      check('a quote carries an expiry in the future', (() => {
        const q = mk();
        return Date.parse(q.expiresAt) > Date.parse(q.createdAt);
      })());

      // Expiry on READ, not only on write: a quote that outlives its window must be unusable
      // even if nothing else has been written since.
      const q = mk();
      check('CONTROL: that quote is live right now', store.get(q.id).expired === undefined);
      clock = new Date(Date.parse(q.expiresAt) + 1);
      const after = store.get(q.id);
      check('a quote read AFTER its expiry is marked expired',
        after !== null && after.expired === true,
        `expired=${after?.expired}`);
      check('CONTROL: the expiry is a MARKING, not a deletion — the record is still readable',
        after.id === q.id && after.provider === LOCAL_ID,
        'createJob needs the record to say WHICH quote expired');

      // Exactly at the boundary: `Date.parse(expiresAt) > now()` is false when equal, so a quote
      // at its exact expiry instant is expired. Pinned because either choice is defensible and
      // only one is implemented.
      clock = new Date(Date.parse(q.expiresAt));
      check('a quote AT its exact expiry instant is expired (the bound is exclusive)',
        store.get(q.id).expired === true,
        'Date.parse(expiresAt) > now() — equal means expired');

      // Pruning: expired quotes are dropped on write, so the store cannot grow without bound.
      clock = new Date(Date.parse(q.expiresAt) + 1000);
      const before = store.list().length;
      mk();
      check('CONTROL: there was something to prune', before > 0, `${before} quote(s) before`);
      check('an expired quote is PRUNED on the next write',
        !store.list().some((x) => x.id === q.id),
        `${store.list().length} quote(s) after`);

      // Ownership default. A quote with no owner is 'unknown', not the empty string and not
      // undefined — an absent owner must not compare equal to a real one.
      const anon = store.create({ provider: LOCAL_ID, params: {}, pricing: {} });
      check('a quote with no owner defaults to a named value, not undefined or ""',
        anon.owner === 'unknown', `owner=${JSON.stringify(anon.owner)}`);
      check('the default owner does not collide with a real one',
        anon.owner !== 'owner', 'otherwise an anonymous quote would be readable by the operator');

      // The frozen decision must survive a round-trip through the file, since that is the whole
      // reason the quote exists rather than being re-derived at job time.
      const frozen = store.create({
        provider: LOCAL_ID, params: { prompt: 'x', duration: 6 },
        licenceDecision: { commercial: false, granted: false },
        pricing: { estimated_micros: 0, estimated_usd: '0.0000' },
      });
      const reread = store.get(frozen.id);
      check('the frozen licence decision survives the round-trip',
        reread.licenceDecision.commercial === false && reread.licenceDecision.granted === false);
      check('the frozen pricing survives the round-trip',
        reread.pricing.estimated_micros === 0 && reread.pricing.estimated_usd === '0.0000');
      check('CONTROL: params survive too', reread.params.duration === 6);
    }

    // ── D. the ORDER of the gates ────────────────────────────────────────────
    section('D. a caller must learn the REAL reason first');
    {
      // The gate order is a UX contract as much as a safety one. If the spend gate ran before
      // the licence gate, a licence-refused request would be told to configure a budget — true
      // and useless, and it would send the operator to the wrong file.
      //
      // The FIRST draft of this section passed `env: {}`, so nothing was enabled and every
      // request came back E_PROVIDER_DISABLED — including the "valid request passes" control.
      // That was the probe being wrong about the default, not the code: an unset
      // SWAN_VIDEO_PROVIDERS_ENABLED enables nothing, which is the fail-closed reading.
      const ON = { SWAN_VIDEO_PROVIDERS_ENABLED: LOCAL_ID, SWAN_VIDEO_MAX_SPEND_USD_DAILY: '0' };
      const call = (params, e = ON) => {
        try {
          preflight({ params, env: e, ledger: null, now: () => new Date('2026-09-18T12:00:00Z') });
          return 'allowed';
        } catch (err) { return err.code || err.name; }
      };
      const base = { prompt: 'round 8', category: 'social-clip', style: 'cinematic', duration: 2 };

      check('CONTROL: a valid free local request passes the gates',
        call({ ...base, provider: LOCAL_ID, commercial: false }) === 'allowed',
        `-> ${call({ ...base, provider: LOCAL_ID, commercial: false })}`);

      check('a COMMERCIAL local request is refused for LICENCE, not for money',
        call({ ...base, provider: LOCAL_ID, commercial: true }) === 'E_LICENCE_GRANT_REQUIRED',
        `-> ${call({ ...base, provider: LOCAL_ID, commercial: true })}`);
      // ENABLEMENT PRECEDES LICENCE. With nothing enabled, H3 reports DISABLED even though its
      // licence would also refuse it — the coarser gate speaks first. Asserted because the
      // reverse order would also be defensible, and only one is implemented.
      check('ENABLEMENT is checked before LICENCE',
        call({ ...base, provider: LOCAL_ID, commercial: true }, {}) === 'E_PROVIDER_DISABLED',
        `with nothing enabled: -> ${call({ ...base, provider: LOCAL_ID, commercial: true }, {})}`);
      check('a hosted request is refused for ENABLEMENT before anything else',
        call({ ...base, provider: 'higgsfield/kling-3.0', commercial: false, initImage: 'x.png' }) === 'E_PROVIDER_DISABLED',
        `-> ${call({ ...base, provider: 'higgsfield/kling-3.0', commercial: false, initImage: 'x.png' })}`);
      check('an unknown provider is refused as UNKNOWN, not as disabled',
        call({ ...base, provider: 'nope/nope', commercial: false }) === 'E_UNKNOWN_PROVIDER',
        `-> ${call({ ...base, provider: 'nope/nope', commercial: false })}`);

      // LICENCE PRECEDES INPUT SHAPE, and that is correct rather than incidental: a commercial
      // request against H3 is unlawful whatever the prompt says, so telling the caller to fix
      // their prompt would be true and useless. The complementary case proves input validation
      // does run once the licence question is settled.
      check('a malformed prompt is refused as INPUT once the licence question is settled',
        call({ ...base, prompt: '', provider: LOCAL_ID, commercial: false }) === 'E_BAD_INPUT',
        `non-commercial, empty prompt -> ${call({ ...base, prompt: '', provider: LOCAL_ID, commercial: false })}`);
      check('a LICENCE refusal wins over a malformed prompt, because no prompt would make it lawful',
        call({ ...base, prompt: '', provider: LOCAL_ID, commercial: true }) === 'E_LICENCE_GRANT_REQUIRED',
        `commercial, empty prompt -> ${call({ ...base, prompt: '', provider: LOCAL_ID, commercial: true })}`);
      check('CONTROL: every refusal above is a PreflightError with a code',
        throws(() => preflight({ params: { ...base, provider: 'nope' }, env: ON, ledger: null })) === 'E_UNKNOWN_PROVIDER');
    }

    // ── E. provenance completeness ───────────────────────────────────────────
    section('E. the artifact record must be able to prove what produced it');
    {
      // The demo asserts the provenance of a real render. This asserts the CONTRACT, so a
      // missing field is caught here rather than in a render nobody runs.
      const { buildProvenance, hashForProvenance, PROMPT_KEEP_CHARS } = await import('../shared/providers/video/provenance.mjs')
        .catch(() => ({ buildProvenance: null }));
      check('CONTROL: the provenance builder is importable',
        typeof buildProvenance === 'function', buildProvenance ? 'found' : 'NOT FOUND');
      check('CONTROL: the prompt bound is the documented 500',
        PROMPT_KEEP_CHARS === 500, `PROMPT_KEEP_CHARS=${PROMPT_KEEP_CHARS}`);
      if (typeof buildProvenance === 'function') {
        const caps = {
          provider: LOCAL_ID, attribution: 'Video generated with MiniMax H3',
          licence: {
            name: 'MiniMax H3 Model Licence', restricts: 'model-execution',
            commercialUse: 'requires-grant', excludedTerritories: ['US'],
            requiresAttribution: true, grantRequestDoc: 'docs/x.md',
          },
        };
        const p = buildProvenance({
          caps, request: { prompt: 'a bird', duration: 2, category: 'social-clip', style: 'cinematic' },
          job: { id: 'job-1', provider: LOCAL_ID },
          result: { filename: 'x.mp4', sha256: 'deadbeef', bytes: 10 },
          // A DATE, not a `now()` function. Every OTHER module in this lane takes a function and
          // calls it; this one takes the instant. That is an inconsistency worth naming — the
          // first draft of this probe passed a function and crashed on `now.toISOString` — but it
          // is not a defect: the production caller passes `now()` (generateVideo.mjs:255), and
          // the parameter defaults to `new Date()`, so the two agree.
          now: new Date('2026-09-18T12:00:00Z'),
          usedCommercially: false,
        });
        const text = JSON.stringify(p);
        check('CONTROL: provenance is non-trivial', Object.keys(p).length >= 5,
          `${Object.keys(p).length} field(s)`);
        // THE FIRST DRAFT OF THIS CHECK WAS WRONG. It asserted "carries the PROMPT HASH, not the
        // prompt", and failed: the record carries BOTH — up to `PROMPT_KEEP_CHARS` of the prompt
        // for human review, plus a sha256 of the FULL prompt. That is deliberate and documented,
        // so the property worth testing is the BOUND, not the absence.
        check('provenance carries a sha256 of the prompt',
          /^[0-9a-f]{64}$/.test(p.request.promptSha256),
          `${String(p.request.promptSha256).slice(0, 16)}…`);
        check('the stored prompt is TRUNCATED to the documented bound',
          p.request.prompt.length <= 500 && p.request.prompt === 'a bird',
          `short prompt stored whole: "${p.request.prompt}"`);
        check('the truncation flag is accurate in BOTH directions', (() => {
          const long = 'x'.repeat(600);
          const pl = buildProvenance({
            caps, request: { prompt: long, duration: 2 }, result: {},
            now: new Date('2026-09-18T12:00:00Z'),
          });
          return pl.request.prompt.length === 500 && pl.request.promptTruncated === true
            && p.request.promptTruncated === false;
        })(), 'short -> false, 600 chars -> true and stored at 500');
        check('the hash is of the FULL prompt, not of the truncated slice', (() => {
          const long = 'y'.repeat(600);
          const pl = buildProvenance({
            caps, request: { prompt: long, duration: 2 }, result: {},
            now: new Date('2026-09-18T12:00:00Z'),
          });
          // The stored slice must NOT hash to the recorded value — otherwise the record could
          // never verify the prompt that was actually sent.
          return pl.request.promptSha256 !== hashForProvenance(pl.request.prompt)
            && pl.request.promptSha256 === hashForProvenance(long);
        })(), 'a truncated slice cannot reproduce the recorded hash — by design');
        check('provenance carries the LICENCE SNAPSHOT',
          text.includes('requires-grant') && text.includes('US'),
          'the licence terms in force at render time, not the current ones');
        check('provenance carries the commercial-use decision explicitly',
          /usedCommercially|used_commercially/.test(text),
          'a boolean, so the record cannot be read as an accident');
        check('provenance does NOT leak a filesystem path',
          !/AppData|C:\/|\/Users\//.test(text));
        check('provenance names the model and its attribution',
          text.includes(LOCAL_ID) || text.includes('MiniMax H3'));
      }
    }
  } finally {
    await new Promise((res) => server.close(res));
  }

  console.log(`\n${pass + fail} CHECKS — ${pass} passed, ${fail} failed`);
  if (failures.length) console.log(`failed: ${failures.join(' | ')}`);
  process.exit(fail === 0 ? 0 : 1);
}

await main();
