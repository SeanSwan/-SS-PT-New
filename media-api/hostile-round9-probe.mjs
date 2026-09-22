#!/usr/bin/env node
/**
 * hostile-round9-probe.mjs — the NINTH hostile pass.
 *
 * Round 8 came back dry, but one dry pass can be luck. This pass attacks surfaces no
 * earlier round touched, chosen because each one is a place where a wrong answer is
 * either a MONEY answer or a STATE answer:
 *
 *   A. the LEDGER, read back — what a tampered file does to the ceilings
 *   B. WHO a quote belongs to, in every quote state
 *   C. the store's invariants under a full store, a corrupt file, and a tied clock
 *   D. the route table, as a TABLE rather than one endpoint at a time
 *   E. the auth primitive, driven directly rather than through the server
 *   F. disclosures — things this gateway does NOT do, said out loud
 *
 * ── WHAT "DRY" MEANS HERE ───────────────────────────────────────────────────
 * Not "no checks failed" — a section of tautologies passes trivially. Dry means: every
 * section ran its control, every claim was falsifiable, and nothing new was found. Where a
 * finding is a SCOPE gap rather than a defect, it is recorded as a DISCLOSURE with the
 * reason, because silently "fixing" an unbuilt slice is how scope lies get shipped.
 */

import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { makeJobStore, makeQuoteStore, STATUS } from './store.mjs';
import { matchRoute } from './router.mjs';
import { authorized, MAX_BODY_BYTES } from './http.mjs';
import { createJob } from './routes.mjs';
import { makeFileLedger, readLimits, checkRunAllowed } from '../shared/providers/video/spendGuard.mjs';

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? `\n          ${detail}` : ''}`); }
  else { fail += 1; failures.push(name); console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
}
function section(t) { console.log(`\n── ${t} ──`); }
const throws = (fn) => { try { fn(); return null; } catch (e) { return e.code || e.name; } };

/** Source-text reads are normalised: the worktree is LF, a `git apply`-ed checkout is CRLF. */
const readSource = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

const DAY = '2026-09-18';
const root = mkdtempSync(join(tmpdir(), 'swan-media-round9-'));

/** A ledger whose FILE CONTENT we control completely, so we can tamper with it. */
const ledgerOf = (json) => makeFileLedger('ledger.json', {
  readFileSync: () => json,
  writeFileSync: () => {},
});
const usageOf = (rec) => ledgerOf(JSON.stringify({ [DAY]: rec })).usageFor(DAY);

const BILLED = { provider: 'higgsfield/kling-3.0', costPerRunUsd: 5 };
const FREE = { provider: 'comfyui/minimax-h3', costPerRunUsd: 0 };
const LIMITS = readLimits({ SWAN_VIDEO_MAX_RUNS_DAILY: '10', SWAN_VIDEO_MAX_SPEND_USD_DAILY: '10' });

/** An in-memory fs for the quote store, so the clock and the file are both controlled. */
function memFs() {
  const box = { data: null };
  return {
    fs: {
      existsSync: () => box.data !== null,
      readFileSync: () => box.data,
      writeFileSync: (_p, s) => { box.data = s; },
      renameSync: () => {},
      mkdirSync: () => {},
    },
  };
}

async function main() {
  console.log('HOSTILE PROBE — ROUND 9\n');

  // ── A. THE LEDGER, READ BACK ───────────────────────────────────────────────
  // `record()` was hardened to be monotonic because an external reviewer drove a
  // recorded 5 runs / $5 back down to 1 / $1. That fix guards the WRITE. This section
  // asks the question one step over: what does the READ do with a value that is already
  // in the file?
  //
  // The invariant is deliberately NOT "the number is clamped to zero". Zero is a FRESH
  // DAY, so clamping a tampered -999 to 0 would still hand the caller more headroom than
  // the honest ledger gave them. A negative count is not a count; it is evidence the file
  // was not written by this code, which is exactly the `degraded` state the guard already
  // has a word for. The money answer must be a REFUSAL.
  section('A. no ledger CONTENT can buy headroom beyond an honest reading');

  check('CONTROL: an honest ledger at the cap is refused',
    throws(() => checkRunAllowed(BILLED, usageOf({ runs: 10, spendUsd: 10 }), LIMITS)) === 'E_RUN_CAP');
  check('CONTROL: an honest ledger under the cap is allowed',
    checkRunAllowed(BILLED, usageOf({ runs: 3, spendUsd: 3 }), LIMITS).allowed === true);
  check('CONTROL: a large honest ledger is refused by the cap',
    throws(() => checkRunAllowed(BILLED, usageOf({ runs: 1e15, spendUsd: 1e15 }), LIMITS)) === 'E_RUN_CAP');
  check('CONTROL: a MISSING ledger is still a fresh day, not a refusal',
    throws(() => checkRunAllowed(BILLED, usageOf({}), LIMITS)) === null,
    'an absent file and an unreadable one must not collapse into one answer');

  const tampered = [
    ['negative runs', { runs: -999, spendUsd: 0 }],
    ['negative spend', { runs: 0, spendUsd: -999 }],
    ['both negative', { runs: -999, spendUsd: -999 }],
    ['a negative spend under the run cap', { runs: 1, spendUsd: -1e9 }],
    ['a non-finite count', { runs: 1e999, spendUsd: 0 }],
    ['a non-numeric count', { runs: 'many', spendUsd: 0 }],
  ];
  for (const [label, rec] of tampered) {
    const usage = usageOf(rec);
    const negative = usage.runs < 0 || usage.spendUsd < 0;
    check(`a ledger with ${label} yields no negative headroom`, !negative,
      negative ? `usageFor returned ${JSON.stringify(usage)} — a negative count is not a count` : '');
    check(`  …and a BILLING provider is refused against it`,
      throws(() => checkRunAllowed(BILLED, usage, LIMITS)) !== null,
      `usageFor said ${JSON.stringify(usage)}, and the guard said ${throws(() => checkRunAllowed(BILLED, usage, LIMITS)) ?? 'ALLOWED'}`);
  }

  // ── B. WHO A QUOTE BELONGS TO, IN EVERY STATE ──────────────────────────────
  // `createJob` states the invariant in its own comment: "404, not 403: a caller should
  // not learn that another principal's quote exists." That is a claim about
  // INDISTINGUISHABILITY, so it must hold in every state a quote can be in — including
  // expired. If an expired foreign quote answers 410 while a missing one answers 404,
  // the difference IS the oracle the comment says does not exist.
  section('B. another principal\'s quote is indistinguishable from no quote');

  let clock = new Date('2026-09-18T00:00:00Z');
  const { fs: qfs } = memFs();
  const quotes = makeQuoteStore('quotes.json', { fs: qfs, now: () => clock });
  const makeQuote = (owner) => quotes.create({
    owner,
    provider: 'higgsfield/kling-3.0',
    executionKind: 'hosted',
    params: { provider: 'higgsfield/kling-3.0', prompt: 'a lighthouse' },
    licenceDecision: { commercial_use: false },
    pricing: { estimated_micros: 0, estimated_usd: '0.0000' },
    admitted: true,
  });
  const ask = (principal, quoteId) => createJob({
    body: { quote_id: quoteId, max_cost_usd: 1 },
    env: {}, ledger: null, jobs: { create: () => ({ id: 'j' }) }, quotes, runner: () => {}, principal,
  });

  const aliceLive = makeQuote('alice');
  check('CONTROL: alice may use her own live quote', ask('alice', aliceLive.id).status === 202);

  const liveForeign = ask('bob', aliceLive.id);
  const missing = ask('bob', 'no-such-quote-at-all');
  check('CONTROL: a foreign LIVE quote and a missing quote answer identically',
    liveForeign.status === missing.status && liveForeign.body.error.code === missing.body.error.code,
    `foreign=${liveForeign.status} ${liveForeign.body.error.code}  missing=${missing.status} ${missing.body.error.code}`);

  clock = new Date('2026-09-18T00:06:00Z');   // past the five-minute default TTL
  const expiredForeign = ask('bob', aliceLive.id);
  check('a foreign EXPIRED quote and a missing quote answer identically',
    expiredForeign.status === missing.status && expiredForeign.body.error.code === missing.body.error.code,
    `foreign-expired=${expiredForeign.status} ${expiredForeign.body.error.code}  missing=${missing.status} ${missing.body.error.code}`);

  check('CONTROL: alice is still told her OWN quote expired', ask('alice', aliceLive.id).status === 410);

  // ── C. THE STORE'S INVARIANTS ──────────────────────────────────────────────
  section('C. the store keeps what it acknowledged');

  const frozen = () => new Date('2026-09-18T00:00:00Z');
  const p1 = join(root, 'full.json');
  const small = makeJobStore(p1, { maxJobs: 2, now: frozen });
  const ids = [1, 2, 3].map((n) => small.create({ provider: `p${n}` }).id);
  check('CONTROL: a store capped at 2 holds 2', small.list().length === 2, `holds ${small.list().length}`);
  check('the job created LAST is retrievable, not the one pruned away', small.get(ids[2]) !== null);

  const p2 = join(root, 'tied.json');
  const tied = makeJobStore(p2, { maxJobs: 2, now: frozen });
  const tiedIds = [1, 2, 3, 4].map((n) => tied.create({ provider: `p${n}` }).id);
  check('a TIED clock does not let the newest job be the one discarded', tied.get(tiedIds[3]) !== null,
    'a coarse clock or an injected now is the case the create() guard exists for');

  const p3 = join(root, 'corrupt.json');
  writeFileSync(p3, '{ this is not json');
  check('CONTROL: a missing store is a fresh start', makeJobStore(join(root, 'absent.json')).list().length === 0);
  check('a corrupt store REFUSES rather than resetting history',
    throws(() => makeJobStore(p3).list()) === 'E_STORE_CORRUPT');

  const p4 = join(root, 'atomic.json');
  makeJobStore(p4).create({ provider: 'x' });
  check('CONTROL: the write landed', existsSync(p4) && JSON.parse(readFileSync(p4, 'utf8')).schema === 1);
  check('the temp file does not survive the rename', !existsSync(`${p4}.tmp`));

  const p5 = join(root, 'orphans.json');
  const before = makeJobStore(p5);
  const live = before.create({ provider: 'higgsfield/kling-3.0', billed: true });
  const done = before.create({ provider: 'higgsfield/kling-3.0', billed: true });
  before.update(done.id, { status: STATUS.SUCCEEDED });
  const reconciled = makeJobStore(p5).reconcileOrphans();
  check('CONTROL: only the non-terminal job is reconciled',
    reconciled.length === 1 && reconciled[0] === live.id);
  check('every id reconcileOrphans REPORTS is still retrievable afterwards',
    reconciled.every((id) => makeJobStore(p5).get(id) !== null),
    'reporting an id it dropped would be a claim about a record that is gone');

  // ── D. THE ROUTE TABLE, AS A TABLE ─────────────────────────────────────────
  section('D. the route table is exhaustive and its ids are opaque');

  const table = [
    { m: 'GET', p: '/health', match: true },
    { m: 'GET', p: '/v1/models', match: true, name: 'listModels' },
    { m: 'GET', p: '/v1/wallet', match: true, name: 'wallet' },
    { m: 'POST', p: '/v1/estimate', match: true, name: 'estimate' },
    { m: 'POST', p: '/v1/quotes', match: true, name: 'createQuote' },
    { m: 'POST', p: '/v1/jobs', match: true, name: 'createJob' },
    { m: 'GET', p: '/v1/jobs/abc', match: true, name: 'getJob' },
    { m: 'POST', p: '/v1/jobs/abc/cancel', match: true, name: 'cancelJob' },
    { m: 'GET', p: '/v1/assets/abc', match: true, name: 'getAsset' },
    { m: 'GET', p: '/v1/assets/abc/content', match: true, name: 'getAssetContent' },
    { m: 'GET', p: '/v1/jobs/a/b', match: false },
    { m: 'GET', p: '/health/', match: false },
    { m: 'GET', p: '/V1/MODELS', match: false },
    { m: 'DELETE', p: '/v1/jobs/abc', match: false },
    { m: 'GET', p: '/', match: false },
  ];
  const wrong = [];
  for (const row of table) {
    const r = matchRoute(row.m, row.p);
    const matched = r !== null;
    const named = matched ? (r.handler.name || 'anonymous') : null;
    if (matched !== row.match) wrong.push(`${row.m} ${row.p} -> ${named ?? 'null'} (expected match=${row.match})`);
    else if (row.match && row.name && named !== row.name) wrong.push(`${row.m} ${row.p} -> ${named} (expected ${row.name})`);
  }
  check('every row of the route table resolves as declared', wrong.length === 0,
    wrong.length ? wrong.join('\n          ') : `${table.length} rows`);

  const assetRow = matchRoute('GET', '/v1/assets/abc');
  const contentRow = matchRoute('GET', '/v1/assets/abc/content');
  check('CONTROL: the asset route and the content route are DIFFERENT handlers',
    assetRow.handler !== contentRow.handler);
  check('an asset id may not contain a slash', matchRoute('GET', '/v1/assets/a/b') === null);
  check('a percent-encoded slash is carried through as an OPAQUE id, not decoded',
    matchRoute('GET', '/v1/assets/a%2Fb')?.id === 'a%2Fb',
    'the id is a store key, never a path — decoding it would be the traversal');

  // ── E. THE AUTH PRIMITIVE, DRIVEN DIRECTLY ─────────────────────────────────
  section('E. the auth primitive fails closed on its own, not because a caller is careful');

  const req = (authorization) => ({ headers: { authorization } });
  const TOK = 'a'.repeat(32);
  check('CONTROL: the right token is accepted', authorized(req(`Bearer ${TOK}`), TOK) === true);
  check('CONTROL: the wrong token is rejected', authorized(req(`Bearer ${'b'.repeat(32)}`), TOK) === false);
  check('the scheme is case-insensitive (RFC 7235)', authorized(req(`bearer ${TOK}`), TOK) === true);

  for (const [label, token] of [['undefined', undefined], ['null', null], ['empty', ''], ['a number', 12345]]) {
    check(`a configured token that is ${label} refuses everything`,
      authorized(req('Bearer undefined'), token) === false
      && authorized(req(`Bearer ${String(token)}`), token) === false);
  }
  check('the literal string "Bearer undefined" does not match an undefined token',
    authorized(req('Bearer undefined'), undefined) === false,
    'safeEqual stringifies both sides, so this is the bypass the guard exists for');
  check('an empty or absent Authorization header is rejected',
    authorized(req(''), TOK) === false && authorized(req(undefined), TOK) === false);
  check('a non-Bearer scheme is rejected', authorized(req(`Basic ${TOK}`), TOK) === false);

  // ── F. DISCLOSURES ─────────────────────────────────────────────────────────
  section('F. what this gateway does NOT do');

  const freeUsage = ledgerOf('{ truncated').usageFor(DAY);
  const freeOutcome = checkRunAllowed(FREE, freeUsage, LIMITS);
  check('DISCLOSURE: a corrupt ledger reports today\'s usage as ZERO runs',
    freeUsage.runs === 0 && freeUsage.degraded === true,
    'so the VOLUME ceiling cannot bind on the free path either — money is what degrades asymmetrically');
  check('DISCLOSURE: and the free path is therefore allowed with no volume bound',
    freeOutcome.allowed === true && freeOutcome.runCost === 0,
    'deliberate: a bookkeeping fault must not become an outage for the zero-cost lane. It does '
    + 'mean "there is always a cap" is false while the ledger is unreadable.');

  const writes = [];
  makeJobStore('C:/somewhere/jobs.json', {
    fs: {
      existsSync: () => true,
      readFileSync: () => JSON.stringify({ schema: 1, jobs: [] }),
      writeFileSync: (p) => writes.push(p),
      renameSync: () => {},
      mkdirSync: () => {},
    },
  }).create({ provider: 'x' });
  check('DISCLOSURE: the atomic write uses a FIXED sibling temp name',
    writes.length === 1 && writes[0] === 'C:/somewhere/jobs.json.tmp',
    `wrote ${JSON.stringify(writes)} — two writers on one path share it`);

  const routesSrc = readSource('./routes.mjs');
  check('CONTROL: the source read is live (the normaliser found the file)',
    routesSrc.includes('E_ARTIFACT_MISSING'));
  check('DISCLOSURE: content-length comes from a stat taken BEFORE the stream opens',
    routesSrc.indexOf('statSync(path)') < routesSrc.indexOf('stream: { path, bytes: stat.size'),
    'a file that changes size between the two sends a content-length that is already wrong');

  check('CONTROL: MAX_BODY_BYTES is a real finite ceiling',
    Number.isFinite(MAX_BODY_BYTES) && MAX_BODY_BYTES > 0);

  console.log(`\n${pass + fail} CHECKS — ${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log('\nFAILED:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('PROBE CRASHED — the checks below the crash NEVER RAN:', err);
  process.exit(2);
});
