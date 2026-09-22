#!/usr/bin/env node
/**
 * hostile-round7-probe.mjs — the SEVENTH hostile pass, and the one that is supposed to find
 * NOTHING.
 *
 * Rounds 1–6 each found defects. Rule 74's loop only closes when a FULL pass comes up dry, so
 * this round deliberately attacks the surfaces the earlier rounds did not:
 *
 *   A. the module extractions — did splitting a file change an identity or a behaviour?
 *   B. the money predicates — boundaries and PROPERTIES, not examples
 *   C. the route table — is every advertised endpoint actually dispatchable?
 *   D. refusal-code coverage — scoped to the gateway, not the whole repo
 *   E. the public projection — can any internal field reach a caller?
 *   F. the status table's own hygiene
 *
 * ── WHY PROPERTIES, NOT MORE EXAMPLES ───────────────────────────────────────
 * Rounds 2–6 each found a defect by naming an input the author had not thought of (`true`,
 * `''`, `null`, `undefined`). Enumerating more inputs is a losing game; the round that closes
 * the loop has to test the SHAPE of the answer — monotonicity, round-tripping, closure — so
 * that an input nobody thought of is still covered by the invariant.
 *
 * ── CONTROLS, EVERY SECTION ─────────────────────────────────────────────────
 * A section with no control can pass vacuously. Round 2 proved that the hard way.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  toMicros, formatUsd, isExplicitZero, estimateRunCostMicros, MICROS_PER_USD,
} from '../shared/providers/video/costEstimate.mjs';
import * as registry from '../shared/providers/video/registry.mjs';
import * as normalizeResponse from '../shared/providers/video/normalizeResponse.mjs';
import * as catalogue from '../shared/providers/video/catalogue.mjs';
import * as specShape from '../shared/providers/video/specShape.mjs';
import { VIDEO_PROVIDERS } from '../shared/providers/video/catalogue.mjs';
import { matchRoute } from './router.mjs';
import { STATUS_BY_CODE, statusFor, publicJob, fail as failEnvelope } from './wire.mjs';

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { fail += 1; failures.push(name); console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
}
function section(t) { console.log(`\n── ${t} ──`); }
const throws = (fn) => { try { fn(); return null; } catch (e) { return e.code || e.name; } };

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const read = (rel) => readFileSync(join(REPO, rel), 'utf8').replace(/\r\n/g, '\n');
// NOTE the normalisation. A source-text assertion is a claim about a file that exists as LF in the
// worktree and CRLF in a `git apply`-ed checkout, so a pattern containing a literal `\n` will pass
// in one and fail in the other. Round 6 shipped exactly that bug and the patch verification caught
// it — see its `readSource` helper for the full account.

async function main() {
  console.log('HOSTILE PROBE — ROUND 7 (the dry-pass round)\n');

  // ── A. the extractions must not have changed an identity ──────────────────
  section('A. splitting a file must not change what a caller imports');
  {
    // `normalizeProviderResponse` moved to its own module and `assertSpecShape` moved with the
    // shape contract, both re-exported from their old homes. A re-export that resolves to a
    // DIFFERENT function is a silent API change: `registry.normalizeProviderResponse` would
    // still exist and still work, while anything comparing it by identity quietly failed.
    check('CONTROL: both modules actually export something',
      typeof registry.normalizeProviderResponse === 'function'
      && typeof normalizeResponse.normalizeProviderResponse === 'function');
    check('registry.normalizeProviderResponse IS normalizeResponse.normalizeProviderResponse',
      registry.normalizeProviderResponse === normalizeResponse.normalizeProviderResponse,
      'a re-export must be the same binding, not a copy');

    check('CONTROL: both modules export the validator',
      typeof catalogue.assertSpecShape === 'function' && typeof specShape.assertSpecShape === 'function');
    check('catalogue.assertSpecShape IS specShape.assertSpecShape',
      catalogue.assertSpecShape === specShape.assertSpecShape);
    check('catalogue.ProviderSpecError IS specShape.ProviderSpecError',
      catalogue.ProviderSpecError === specShape.ProviderSpecError);

    // The extracted function must still behave, not merely exist.
    check('CONTROL: the extracted flattener still flattens',
      normalizeResponse.normalizeProviderResponse({ output: { url: 'x.mp4' } }).videoUrl === 'x.mp4');
    check('the extracted flattener handles every nesting the old one did',
      normalizeResponse.normalizeProviderResponse({ video_url: 'a.mp4' }).videoUrl === 'a.mp4'
      && normalizeResponse.normalizeProviderResponse({ data: { videoUrl: 'b.mp4' } }).videoUrl === 'b.mp4'
      && normalizeResponse.normalizeProviderResponse({ data: { video_url: 'c.mp4' } }).videoUrl === 'c.mp4',
      'data.* and top-level, snake and camel');
    check('the extracted flattener still treats a URL as terminal',
      normalizeResponse.normalizeProviderResponse({ status: 'processing', videoUrl: 'd.mp4' }).status === 'completed');

    // `firstString` was exported alongside; a stale duplicate in registry.mjs would now be dead
    // code that reads as live. Assert the move was complete.
    check('registry.mjs no longer carries a duplicate firstString',
      !/function firstString/.test(read('shared/providers/video/registry.mjs')),
      'the helper moved with its only caller');
  }

  // ── B. the money predicates: boundaries and PROPERTIES ────────────────────
  section('B. the money predicates, by boundary and by invariant');
  {
    // BOUNDARIES. `isExplicitZero` decides "free", which is the single most dangerous reading in
    // the module, so every string that a whitespace-trimming parser might see is pinned.
    const FREE = ['0', '0.0', '0.00', '00', ' 0 ', '\t0\n', 0, '0.000000'];
    const NOT_FREE = ['', ' ', '\t', '\n', false, true, null, undefined, 'free', '0.1', '1',
      '0.0000001', '0x0', '0b0', '0e0', [], {}, -0.1, ' -0', '0 0'];
    const freeWrong = FREE.filter((v) => isExplicitZero(v) !== true);
    const notFreeWrong = NOT_FREE.filter((v) => isExplicitZero(v) !== false);
    check('CONTROL: the FREE list is non-empty and all really are free',
      FREE.length >= 8 && freeWrong.length === 0, `${FREE.length} shape(s), ${freeWrong.length} wrong`);
    check('CONTROL: the NOT_FREE list is non-empty and all really are not free',
      NOT_FREE.length >= 15 && notFreeWrong.length === 0,
      `${NOT_FREE.length} shape(s), ${notFreeWrong.length} wrong: ${notFreeWrong.map((v) => JSON.stringify(v)).join(', ')}`);

    // MONOTONICITY — the property that makes the ceiling mean something. If a larger rate or a
    // longer duration could ever produce a SMALLER cost, a caller could lower their exposure by
    // asking for more.
    const cost = (rate, duration) => estimateRunCostMicros(
      { provider: 'p/x', rateUnit: 'second', costPerSecondUsd: rate }, { duration });
    const rates = ['0.000001', '0.01', '0.112', '0.13', '0.5', '0.999999', '1', '2.5', '10'];
    const durations = [1, 2, 5, 6, 30];
    let nonMonotonic = [];
    for (const r of rates) {
      for (let i = 1; i < durations.length; i += 1) {
        const lo = cost(r, durations[i - 1]);
        const hi = cost(r, durations[i]);
        if (!(hi >= lo)) nonMonotonic.push(`rate ${r}: ${durations[i - 1]}s -> ${lo} but ${durations[i]}s -> ${hi}`);
      }
    }
    for (let i = 1; i < rates.length; i += 1) {
      const lo = cost(rates[i - 1], 6);
      const hi = cost(rates[i], 6);
      if (!(hi >= lo)) nonMonotonic.push(`6s: ${rates[i - 1]} -> ${lo} but ${rates[i]} -> ${hi}`);
    }
    check('CONTROL: the monotonicity sweep produced values to compare',
      cost('0.13', 6) === 780_000, `0.13 x 6 = ${cost('0.13', 6)}`);
    check('cost is MONOTONIC in both duration and rate',
      nonMonotonic.length === 0,
      nonMonotonic.length ? nonMonotonic.join(' | ') : `${rates.length} rates x ${durations.length} durations`);

    // EXACTNESS — the reason micro-dollars exist. `rate x duration` must be the exact integer
    // product, with no float drift, for every published rate.
    const inexact = rates.filter((r) => cost(r, 6) !== toMicros(r) * 6);
    check('rate x duration is the EXACT integer product',
      inexact.length === 0,
      inexact.length ? inexact.join(', ') : 'no drift across the rate list');

    // ROUND-TRIP — the wire form must not understate, WITHIN THE PRECISION IT PROMISES.
    // The first draft of this check demanded the string never understate at all, and failed on
    // `0.000001 -> "0.0000"`. That is a DOCUMENTED precision limit, not a defect: `formatUsd`
    // renders four decimals, so nothing below 0.00005 USD can be expressed in the string, and
    // the module says so. The property that actually holds — and the one worth testing — is
    // that at or above the display floor the rendering never understates, and below it the
    // INTEGER stays exact so a gate comparing micros is unaffected.
    const PRECISION_FLOOR_MICROS = 50;   // 0.00005 USD — the smallest cost "0.0001" can express
    const aboveFloor = rates.filter((r) => toMicros(r) >= PRECISION_FLOOR_MICROS);
    const understated = aboveFloor.filter((r) => Number(formatUsd(toMicros(r))) + 1e-9 < Number(r));
    check('CONTROL: the rate list has values at or above the display floor',
      aboveFloor.length >= 8, `${aboveFloor.length} of ${rates.length} rate(s)`);
    check('at or above the display floor, the rendering never understates the rate',
      understated.length === 0,
      understated.length ? understated.map((r) => `${r} -> ${formatUsd(toMicros(r))}`).join(', ')
        : aboveFloor.map((r) => `${r}->${formatUsd(toMicros(r))}`).join(' '));
    // The documented floor, asserted rather than assumed — and the integer that backs it.
    check('BELOW the floor the string is the documented floor, and the micros stay exact',
      formatUsd(1) === '0.0000' && toMicros('0.000001') === 1 && toMicros('0.000049') === 49,
      `1 micro renders "${formatUsd(1)}" but is exactly ${toMicros('0.000001')} micro — `
      + 'gates compare the integer, which is why /v1/estimate now returns estimate_micros too');

    // The carry path in formatUsd: 0.999999 must not render as "0.10000".
    check('formatUsd carries instead of emitting a malformed string',
      formatUsd(999_999) === '1.0000' && formatUsd(MICROS_PER_USD) === '1.0000'
      && !/\.\d{5,}/.test(formatUsd(999_999)),
      `999999 -> ${formatUsd(999_999)}, 1000000 -> ${formatUsd(MICROS_PER_USD)}`);
    check('CONTROL: formatUsd renders a plain value plainly', formatUsd(672_000) === '0.6720',
      `672000 -> ${formatUsd(672_000)}`);
  }

  // ── C. the route table must be exhaustively dispatchable ──────────────────
  section('C. every advertised endpoint must actually dispatch');
  {
    // The documented surface, from ASTRA-PRO-REPLY.md. If a row is missing here, the API
    // answers 404 for an endpoint its own docs advertise — the same class as the adapter gap.
    const DOCUMENTED = [
      ['GET', '/health'], ['GET', '/v1/models'], ['GET', '/v1/wallet'], ['POST', '/v1/estimate'],
      ['POST', '/v1/quotes'], ['POST', '/v1/jobs'], ['GET', '/v1/jobs/abc'],
      ['POST', '/v1/jobs/abc/cancel'], ['GET', '/v1/assets/abc'], ['GET', '/v1/assets/abc/content'],
    ];
    const unrouted = DOCUMENTED.filter(([m, p]) => !matchRoute(m, p));
    check('CONTROL: the documented list is the whole surface', DOCUMENTED.length === 10,
      `${DOCUMENTED.length} endpoint(s)`);
    check('every documented endpoint resolves to a route', unrouted.length === 0,
      unrouted.length ? unrouted.map(([m, p]) => `${m} ${p}`).join(', ') : 'all 10 resolve');

    const missingHandler = DOCUMENTED
      .map(([m, p]) => [m, p, matchRoute(m, p)])
      .filter(([, , r]) => typeof r?.handler !== 'function');
    check('every resolved route carries a callable handler', missingHandler.length === 0,
      missingHandler.map(([m, p]) => `${m} ${p}`).join(', ') || 'all callable');

    // Path parameters must be captured, not swallowed. A route that matches but yields no `id`
    // would hand the handler `undefined` and answer 404 for a resource that exists.
    const needsId = [['GET', '/v1/jobs/abc'], ['POST', '/v1/jobs/abc/cancel'],
      ['GET', '/v1/assets/abc'], ['GET', '/v1/assets/abc/content']];
    const noId = needsId.filter(([m, p]) => matchRoute(m, p)?.id !== 'abc');
    check('every parameterised route captures its id', noId.length === 0,
      noId.map(([m, p]) => `${m} ${p} -> ${JSON.stringify(matchRoute(m, p)?.id)}`).join(', ')
        || 'all capture "abc"');

    // A captured id must not be able to escape its segment. `[^/]+` is what makes traversal inert.
    check('a path parameter cannot contain a slash',
      matchRoute('GET', '/v1/jobs/a/b') === null && matchRoute('GET', '/v1/assets/..%2Fetc')?.id === '..%2Fetc',
      'a raw slash does not match; an encoded one arrives as data for the route to reject');
    check('CONTROL: an unknown path does NOT resolve',
      matchRoute('GET', '/v1/nope') === null && matchRoute('DELETE', '/v1/jobs') === null,
      'the null case is what makes the checks above meaningful');
    check('CONTROL: the method matters, not just the path',
      matchRoute('GET', '/v1/quotes') === null && matchRoute('POST', '/v1/quotes') !== null);
  }

  // ── D. refusal-code coverage, scoped to the gateway ───────────────────────
  section('D. every refusal the gateway can raise has a defined status');
  {
    // SCOPE, stated rather than accidental. Round 5's sweep matched substrings anywhere in the
    // repo; the repo-wide version reports 83 codes, most of them from modules that predate this
    // lane and never touch this gateway. The question that matters is narrower: of the codes the
    // GATEWAY can raise, which have no defined status?
    const GATEWAY = [
      'media-api/http.mjs', 'media-api/router.mjs', 'media-api/routes.mjs',
      'media-api/routesCatalog.mjs', 'media-api/preflight.mjs', 'media-api/server.mjs',
      'media-api/store.mjs', 'media-api/wire.mjs',
      'shared/providers/video/registry.mjs', 'shared/providers/video/specShape.mjs',
      'shared/providers/video/catalogue.mjs', 'shared/providers/video/spendGuard.mjs',
      'shared/providers/video/costEstimate.mjs', 'shared/providers/video/promptPolicy.mjs',
      'shared/providers/video/provenance.mjs',
      // ── ROUND 18 ────────────────────────────────────────────────────────────
      // The four ADAPTER modules were missing from this list, and they raise more refusal codes
      // than anything else here. So this check — whose entire question is "of the codes the
      // gateway can raise, which have no defined status?" — was green about the modules it
      // listed and silent about the ones that would have failed it. Eighteen codes fell through
      // to the 400 fallback unremarked. A gate is only as wide as its list, which is the same
      // lesson as the fifteen-gate receipt that never ran the compliance suite: a green result
      // can be green because it never looked. The adapters are gateway modules: their refusals
      // reach a caller (as `job.error.code`), and `routes.mjs`'s catch is generic.
      'shared/providers/video/comfyuiLocal.mjs', 'shared/providers/video/comfyuiGraph.mjs',
      'shared/providers/video/higgsfield.mjs', 'shared/providers/video/higgsfieldTransport.mjs',
    ];
    check('CONTROL: the gateway module list is real', GATEWAY.every((f) => {
      try { return read(f).length > 0; } catch { return false; }
    }), `${GATEWAY.length} module(s)`);

    const codes = new Map();
    for (const f of GATEWAY) {
      const src = read(f);
      for (const m of src.matchAll(/'(E_[A-Z0-9_]+)'/g)) {
        if (!codes.has(m[1])) codes.set(m[1], new Set());
        codes.get(m[1]).add(f);
      }
    }

    // A code is accounted for when its status is defined somewhere a caller can see. There are
    // FOUR legitimate ways, and the first draft of this check knew only two — it flagged nine
    // codes, all of them correct:
    //   1. in STATUS_BY_CODE, consulted by `statusFor`;
    //   2. paired with an explicit status — `fail(410, 'E_X', ...)` — so `statusFor` is never asked;
    //   3. BOOT-TIME: raised by `readServerConfig` before a socket exists, so it can never be a
    //      response. Its "status" is a non-zero exit, not an HTTP code;
    //   4. a RECORD value, not a thrown refusal: written into a job's `error` field, or the
    //      top-level catch's own fallback. Nothing maps it because nothing throws it.
    // The exemptions are named with a reason so this list cannot silently rot, and the check is
    // run in BOTH directions: a new unmapped code fails, and a stale exemption also fails.
    const NOT_A_WIRE_STATUS = {
      E_CLIENT_ABORTED: 'the client is gone; the top-level catch short-circuits on res.destroyed',
      E_NO_TOKEN: 'BOOT-TIME: readServerConfig refuses to bind without a token',
      E_WEAK_TOKEN: 'BOOT-TIME: readServerConfig refuses a weak token',
      E_NOT_LOOPBACK: 'BOOT-TIME: readServerConfig refuses a non-loopback bind without acknowledgement',
      E_FAILED: 'RECORD: the job-runner catch writes it into a job\'s error field',
      E_RUNNER: 'RECORD: the detached-promise catch writes it into a job\'s error field',
      E_ORPHANED: 'RECORD: reconcileOrphans writes it into a job\'s error field',
      E_INTERNAL: 'FALLBACK: the top-level catch\'s own code, unmapped by definition',
      E_STORE_CORRUPT: 'reaches the wire as 500 through the top-level catch, code passed through',
    };
    const unexplained = [];
    for (const [code, files] of codes) {
      if (STATUS_BY_CODE[code] !== undefined) continue;
      if (NOT_A_WIRE_STATUS[code]) continue;
      const explicit = [...files].some((f) => {
        const src = read(f);
        return new RegExp(`fail\\(\\s*\\d{3}\\s*,\\s*'${code}'`).test(src)
          || new RegExp(`code === '${code}'`).test(src);
      });
      if (!explicit) unexplained.push(`${code} (${[...files].join(', ')})`);
    }
    check('CONTROL: the sweep found codes to check', codes.size >= 30, `${codes.size} distinct code(s)`);
    check('every gateway code is mapped, explicitly statused, or a named exemption',
      unexplained.length === 0,
      unexplained.length ? `NO STATUS ANYWHERE: ${unexplained.join(' | ')}`
        : `${codes.size - Object.keys(NOT_A_WIRE_STATUS).length} mapped, `
          + `${Object.keys(NOT_A_WIRE_STATUS).length} exempt by name`);
    // The other direction: an exemption for a code that no longer exists is a stale claim.
    const staleExemptions = Object.keys(NOT_A_WIRE_STATUS).filter((c) => !codes.has(c));
    check('no exemption is stale', staleExemptions.length === 0,
      staleExemptions.join(', ') || 'every exemption still names a live code');

    // The converse: a mapped code nothing raises claims an enforcement that does not exist. Two
    // are known and are labelled reserved in `wire.mjs`; the label is now asserted, so prose
    // cannot drift away from the table.
    const wireSrc = read('media-api/wire.mjs');
    const unthrown = [...Object.keys(STATUS_BY_CODE)].filter((c) => !codes.has(c));
    const reservedMarker = /RESERVED, NOT THROWN/.test(wireSrc);
    check('CONTROL: there ARE unthrown entries, and they are labelled',
      unthrown.length > 0 && reservedMarker,
      `${unthrown.length} unthrown: ${unthrown.join(', ')}`);
    const unlabelled = unthrown.filter((c) => !wireSrc.includes(`${c}:`) || !reservedMarker);
    check('every unthrown code sits under the reserved label',
      unlabelled.length === 0,
      unlabelled.length ? unlabelled.join(', ') : `${unthrown.join(', ')} — all disclosed`);
    check('CONTROL: an unknown code still falls back to 400', statusFor('E_MADE_UP') === 400);
  }

  // ── E. the public projection must not leak ────────────────────────────────
  section('E. no internal field may reach a caller through publicJob');
  {
    // A fully-populated internal record: every field the store writes, plus the two that carry
    // deployment detail (a filesystem path and a backend credential-ish id).
    const internal = {
      id: 'job-1', owner: 'owner', provider: 'comfyui/minimax-h3', executionKind: 'local_gpu',
      status: 'succeeded', createdAt: '2026-09-18T00:00:00.000Z', updatedAt: '2026-09-18T00:00:01.000Z',
      quoteId: 'q-1', idempotencyKey: 'secret-idem-key', billed: false,
      maxCostUsd: 1, estimateUsd: '0.0000',
      backendId: 'prompt-1', progress: { pct: 100, message: 'succeeded' },
      output: {
        filename: 'x.mp4', bytes: 10, mime: 'video/mp4',
        localPath: 'C:/Users/secret/AppData/Local/Temp/swan/out/x.mp4', sha256: 'deadbeef',
      },
      error: null,
    };
    const pub = publicJob(internal);
    const asText = JSON.stringify(pub);
    check('CONTROL: the projection is non-trivial', Object.keys(pub).length >= 8,
      `${Object.keys(pub).length} field(s)`);
    check('the projection contains no filesystem path',
      !/AppData|C:\/|\/Users\/|Temp/.test(asText), asText.slice(0, 90));
    check('the projection does not carry the idempotency key',
      !asText.includes('secret-idem-key'), 'a replay key is not a caller-facing field');
    check('the projection does not carry the raw output record',
      !asText.includes('deadbeef') && !('output' in pub),
      'assets are addressed by URL, not by an internal record');
    // The fields a caller DOES need must survive the projection.
    check('CONTROL: the fields a caller needs are present',
      pub.id === 'job-1' && pub.state === 'succeeded' && pub.provider === 'comfyui/minimax-h3'
      && pub.quote_id === 'q-1' && Array.isArray(pub.assets),
      `id/state/provider/quote_id/assets all present`);

    // `fail()` is the other thing that crosses the socket. Its envelope must be stable.
    const f = failEnvelope(429, 'E_SPEND_CAP', 'over', { retryable: true, details: { a: 1 } });
    check('CONTROL: fail() builds the documented envelope',
      f.status === 429 && f.body.error.code === 'E_SPEND_CAP' && f.body.error.retryable === true,
      JSON.stringify(f.body));
    check('fail() defaults retryable to FALSE, never to a permissive value',
      failEnvelope(500, 'E_X', 'm').body.error.retryable === false,
      'an unlabelled refusal must not invite a retry');
    check('fail() always emits a details object, so a client need not null-check it',
      failEnvelope(400, 'E_X', 'm').body.error.details !== undefined);
  }

  // ── F. the status table's own hygiene ─────────────────────────────────────
  section('F. STATUS_BY_CODE is frozen and internally sane');
  {
    check('CONTROL: the table has entries', Object.keys(STATUS_BY_CODE).length >= 20,
      `${Object.keys(STATUS_BY_CODE).length} code(s)`);
    check('the table is FROZEN', Object.isFrozen(STATUS_BY_CODE),
      'a mutable status table is a status table any import can rewrite');
    const badStatus = Object.entries(STATUS_BY_CODE).filter(([, s]) => !Number.isInteger(s) || s < 400 || s > 599);
    check('every value is a real 4xx/5xx integer', badStatus.length === 0,
      badStatus.map(([c, s]) => `${c}=${s}`).join(', ') || 'all 4xx/5xx');
    const badName = Object.keys(STATUS_BY_CODE).filter((c) => !/^E_[A-Z0-9_]+$/.test(c));
    check('every key is a well-formed code name', badName.length === 0,
      badName.join(', ') || 'all match E_[A-Z0-9_]+');
    // A 400 is the fallback, so a code deliberately mapped to 400 is indistinguishable from an
    // unmapped one. That is fine only when the code really does mean "your request is wrong".
    const fourHundreds = Object.entries(STATUS_BY_CODE).filter(([, s]) => s === 400).map(([c]) => c);
    check('CONTROL: 400 entries exist and are all request-shaped codes',
      fourHundreds.length > 0 && fourHundreds.every((c) => /^E_(NO_|BAD_|IMAGE_|UNSUPPORTED_|REFUSED)/.test(c)),
      fourHundreds.join(', '));
  }

  // ── G. the estimate must carry the authoritative integer ──────────────────
  section('G. a cost that the display string cannot express must still be readable');
  {
    // `formatUsd` renders four decimals, so a cost below 0.00005 USD renders as "0.0000" —
    // indistinguishable from free in the field a caller reads first. The QUOTE response carries
    // `pricing.estimated_micros`; `/v1/estimate` carried only the string, so the two halves of
    // the same documented flow disagreed about what "the cost" is.
    const { estimate } = await import('./routesCatalog.mjs');
    const priced = estimate({ body: { params: { provider: 'higgsfield/kling-3.0', duration: 6 } } });
    check('CONTROL: the estimate endpoint answers for a served provider',
      priced.status === 200 && priced.body.provider === 'higgsfield/kling-3.0',
      `${priced.status} ${priced.body?.estimate_usd}`);
    check('the estimate carries an INTEGER micro-dollar figure beside the string',
      Number.isInteger(priced.body.estimate_micros) && priced.body.estimate_micros === 672_000,
      `estimate_micros=${priced.body.estimate_micros} estimate_usd="${priced.body.estimate_usd}"`);
    // And the two must agree, so the string cannot drift from the integer it displays.
    check('the string and the integer agree',
      Number(priced.body.estimate_usd) === priced.body.estimate_micros / MICROS_PER_USD,
      `${priced.body.estimate_usd} vs ${priced.body.estimate_micros} micro`);

    // The sub-precision case, where only the integer can distinguish a real cost from free.
    const sub = estimateRunCostMicros(
      { provider: 'p/x', rateUnit: 'second', costPerSecondUsd: '0.000001' }, { duration: 6 });
    check('CONTROL: a sub-precision cost is non-zero and non-null',
      sub === 6, `6 micro-dollars`);
    check('a sub-precision cost is distinguishable from free BY THE INTEGER, not the string',
      sub !== 0 && sub !== null && formatUsd(sub) === '0.0000',
      `micros=${sub} renders "${formatUsd(sub)}" — which is why the integer must be on the wire`);
  }

  console.log(`\n${pass + fail} CHECKS — ${pass} passed, ${fail} failed`);
  if (failures.length) console.log(`failed: ${failures.join(' | ')}`);
  process.exit(fail === 0 ? 0 : 1);
}

await main();
