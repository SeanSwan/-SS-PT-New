import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  withRetry, retryAfterMs, JITTER_FRACTION, MAX_RETRY_AFTER_MS,
} from '../../../shared/providers/transportRetry.mjs';
import { generateBracket, storeStatus, IMAGE_DIR } from '../../../shared/bracket.mjs';
import { buildContactSheet, sheetSrc } from '../../../shared/contactSheet.mjs';

/** A response stub good enough for the retry policy to reason about. */
const resp = (status, headers = {}) => ({
  ok: status < 400, status,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
});

const tmpRoot = () => mkdtempSync(join(tmpdir(), 'forge-fa-'));
const runDir = (root) => join(root, '.ai-workflow', 'forge-runs');

/* ───────────────────────── FA-1: retry policy ───────────────────────── */

test('JITTER decorrelates waits — a bracket does not re-flatten a recovering provider', async () => {
  const waits = [];
  for (const r of [0, 0.5, 1]) {
    let call = 0;
    await withRetry(async () => (call++ === 0 ? resp(500) : resp(200)), {
      sleep: async (ms) => waits.push(ms), random: () => r, maxRetries: 1,
    });
  }
  assert.deepEqual(waits, [750, 1000, 1250], 'base 1000ms +/- 25%');
  assert.equal(JITTER_FRACTION, 0.25);
});

test('the PARSER reports the hint faithfully; the LOOP decides whether to serve it', () => {
  // It used to clamp inside the parser, which hid how long the provider had
  // actually asked for. Reporting and policy are different jobs.
  assert.equal(retryAfterMs(resp(503, { 'retry-after': '999999' })), 999_999_000);
  assert.equal(retryAfterMs(resp(503, { 'retry-after': 'not-a-number' })), null);
  assert.equal(retryAfterMs(resp(503, {})), null);
  assert.equal(retryAfterMs(null), null);
  const at = new Date(Date.now() + 5000).toUTCString();
  const ms = retryAfterMs(resp(503, { 'retry-after': at }), Date.now());
  assert.ok(ms >= 3000 && ms <= 6000, `date form should be ~5s, got ${ms}`);
});

test('a LONG Retry-After ABORTS the option instead of parking the bracket', async () => {
  // Clamping to the total budget meant "obey anything up to three minutes": a
  // provider asking 120s would park a whole bracket on one sleep, converting
  // their problem into our latency. It is an unauthenticated hint from a peer.
  let slept = 0;
  await assert.rejects(
    withRetry(async () => resp(503, { 'retry-after': '120' }),
      { sleep: async (ms) => { slept += ms; }, maxRetries: 2 }),
    (e) => e.code === 'E_PROVIDER_TRANSPORT' && /Aborting rather than parking/.test(e.message),
  );
  assert.equal(slept, 0, 'and it did not wait even once');
  assert.equal(MAX_RETRY_AFTER_MS, 30_000);
});

test('a SHORT Retry-After is still honoured over the local table', async () => {
  const waits = [];
  let call = 0;
  await withRetry(async () => (call++ === 0 ? resp(503, { 'retry-after': '7' }) : resp(200)), {
    sleep: async (ms) => waits.push(ms), random: () => 0.5, maxRetries: 1,
  });
  assert.deepEqual(waits, [7000]);
});

test('the TOTAL BUDGET stops a retry chain BEFORE it sleeps past the limit', async () => {
  let slept = 0;
  const res = await withRetry(async () => resp(500), {
    sleep: async (ms) => { slept += ms; }, random: () => 0.5,
    maxRetries: 5, totalBudgetMs: 1500,
  });
  assert.equal(res.res.status, 500, 'the last real response is surfaced, not swallowed');
  assert.ok(slept <= 1500, `slept ${slept}ms, budget was 1500ms`);
});

test('4xx is STILL never retried, after all this', async () => {
  let call = 0;
  const { res, retries } = await withRetry(async () => { call += 1; return resp(400); },
    { sleep: async () => {}, maxRetries: 3 });
  assert.equal(call, 1);
  assert.equal(retries, 0);
  assert.equal(res.status, 400);
});

/* ─────────────────── FA-1b: per-bracket spend ceiling ─────────────────── */

function pricedProvider(costPer, { failAll = false } = {}) {
  return {
    capabilities: () => ({
      provider: 'p', modelVersion: 'm', promptStyle: 'sentence', maxPromptChars: 4000,
      supportedAspectRatios: ['16:9'], honorsNegativePrompt: 'claimed',
    }),
    generate: async () => {
      if (failAll) {
        const e = new Error('rejected by the safety system');
        e.code = 'E_PROVIDER_SAFETY_REJECT';
        throw e;
      }
      return {
        model: 'm', images: [''], costUsd: costPer, actualWidth: 16, actualHeight: 9,
        aspectRequested: '16:9', promptStyle: 'sentence', brainVersion: '0.2.0', retries: 0,
      };
    },
  };
}

const BRIEF = { briefId: 'b_fa', text: 'a frozen lake at dawn', intent: 'hero', aspect: '16:9' };

test('the SPEND CEILING stops the bracket rather than the wallet', async () => {
  const root = tmpRoot();
  try {
    const r = await generateBracket(BRIEF, pricedProvider(0.04), { n: 6, root, maxSpendUsd: 0.10 });
    assert.equal(r.ceilingHit, true);
    assert.ok(r.ok.length < 6, 'it stopped early');
    const stopper = r.options.find((o) => String(o.notes || '').startsWith('E_SPEND_CEILING'));
    assert.ok(stopper, 'the stop is a queryable ledger row, not a silent break');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('FAILED attempts count against the ceiling — a rejection may still be billed', async () => {
  // Counting only successful costUsd was a silent under-count: a safety
  // rejection happens AFTER the provider has read the prompt, so it can be
  // charged. A spend control that only observes successes is a success message.
  const root = tmpRoot();
  try {
    const r = await generateBracket(BRIEF, pricedProvider(0.001, { failAll: true }),
      { n: 20, root, maxSpendUsd: 0.02 });
    assert.equal(r.ok.length, 0, 'every call failed');
    assert.equal(r.ceilingHit, true, 'and the ceiling still fired, on failures alone');
    assert.ok(r.spendCounted >= 0.02, `counted ${r.spendCounted} against the ceiling`);
    assert.equal(r.costUsd, 0, 'while PROVEN spend stays honestly zero');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('the ceiling is a SOFT bound, and the field names say which number is which', async () => {
  const root = tmpRoot();
  try {
    const r = await generateBracket(BRIEF, pricedProvider(0.004), { n: 3, root });
    assert.equal(r.ceilingHit, false);
    assert.equal(r.ceilingUsd, 0.50);
    assert.equal(r.costUsd, 0.012, 'costUsd = what we can prove we paid');
    assert.equal(r.spendCounted, 0.012, 'spendCounted = what the guard counted');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/* ────────────── FA-2: one code path, and it must resolve ────────────── */

test('THE SHIPPED BUG: a sibling directory links correctly, not to images/', () => {
  // Live bug, deployed. The link branch hardcoded `images/<basename>` — right
  // for forge-runs/images/, silently wrong for every sibling — and it shipped
  // because the INLINE branch was the only one ever exercised.
  const root = tmpRoot();
  try {
    mkdirSync(join(runDir(root), 'ab-avoid'), { recursive: true });
    mkdirSync(join(runDir(root), 'images'), { recursive: true });
    writeFileSync(join(runDir(root), 'ab-avoid', 'x.png'), Buffer.alloc(1024));
    writeFileSync(join(runDir(root), 'images', 'y.png'), Buffer.alloc(1024));
    const mk = (ref) => ({
      status: 'ok', variantId: 'v_00000000000000ab', intent: 'root', promptText: 'p',
      costUsd: 0.004, wallMs: 1, actualWidth: 16, actualHeight: 9, imageRef: ref,
    });
    const html = buildContactSheet(
      [mk('.ai-workflow/forge-runs/ab-avoid/x.png'), mk('.ai-workflow/forge-runs/images/y.png')],
      root, {},
    );
    assert.ok(html.includes('src="./ab-avoid/x.png"'), 'sibling resolves');
    assert.ok(html.includes('src="./images/y.png"'), 'and so does images/');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a missing file is an explicit absence, never a dangling link', () => {
  // The old sheet counted src strings WRITTEN and called that "linked". Every
  // ab-avoid link was broken and it still reported success — intent counted as
  // effect, the third instance of that lie in this subsystem.
  const root = tmpRoot();
  try {
    mkdirSync(join(runDir(root), 'images'), { recursive: true });
    const rows = [{
      status: 'ok', variantId: 'v_00000000000000ab', intent: 'root', promptText: 'p',
      costUsd: 0.004, wallMs: 1, actualWidth: 16, actualHeight: 9,
      imageRef: '.ai-workflow/forge-runs/images/y.png',
    }];
    const html = buildContactSheet(rows, root, {});
    assert.match(html, /image not on disk/);
    assert.ok(!html.includes('<img'), 'no img tag pointing at nothing');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('sheetSrc computes a real relative path, URI-encoded', () => {
  assert.equal(sheetSrc('/a/b', '/a/b/images/my file.png'), './images/my%20file.png');
  assert.ok(sheetSrc('/a/b', '/a/c/x.png').startsWith('..'), 'escapes upward when it must');
});

test('ONE CODE PATH — nothing is inlined, so the sheet stays small', () => {
  // The size threshold, the base64 inflation and the broken-path class all went
  // when inline-or-link collapsed to link.
  const root = tmpRoot();
  try {
    const dir = join(runDir(root), 'images');
    mkdirSync(dir, { recursive: true });
    const rows = [];
    for (let i = 0; i < 3; i += 1) {
      const id = `v_00000000000000a${i}`;
      writeFileSync(join(dir, `${id}.png`), Buffer.alloc(200_000));
      rows.push({
        status: 'ok', variantId: id, intent: 'root', promptText: 'p', costUsd: 0.004,
        wallMs: 1, actualWidth: 16, actualHeight: 9,
        imageRef: `.ai-workflow/forge-runs/images/${id}.png`,
      });
    }
    const html = buildContactSheet(rows, root, {});
    assert.equal((html.match(/src="data:/g) || []).length, 0, 'nothing inlined');
    assert.equal((html.match(/src="\.\//g) || []).length, 3, 'all three linked');
    assert.ok(html.length < 20_000, `sheet is tiny now: ${html.length} bytes`);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/* ─────────────────── FA-3: retention actually runs ─────────────────── */

test('storeStatus WALKS THE WHOLE ROOT — a sibling cannot hide from retention', () => {
  // It counted only forge-runs/images/ and reported 3.6 MB while 14.1 MB sat on
  // disk. A budget that guards one subdirectory is a budget-shaped object.
  const root = tmpRoot();
  try {
    mkdirSync(join(runDir(root), 'images'), { recursive: true });
    mkdirSync(join(runDir(root), 'ab-avoid'), { recursive: true });
    writeFileSync(join(runDir(root), 'images', 'a.png'), Buffer.alloc(1_048_576));
    writeFileSync(join(runDir(root), 'ab-avoid', 'b.png'), Buffer.alloc(1_048_576));
    const st = storeStatus(root, 500);
    assert.equal(st.files, 2, 'both directories counted');
    assert.equal(st.mb, 2);
    assert.deepEqual(st.dirs, ['ab-avoid', 'images'], 'and it names where they live');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('storeStatus reports over-budget, and an empty store is not an error', () => {
  const root = tmpRoot();
  try {
    assert.deepEqual(storeStatus(root), { files: 0, mb: 0, budgetMb: 500, overBudget: false, dirs: [] });
    mkdirSync(join(root, IMAGE_DIR), { recursive: true });
    writeFileSync(join(root, IMAGE_DIR, 'a.png'), Buffer.alloc(2_097_152));
    assert.equal(storeStatus(root, 1).overBudget, true);
    assert.equal(storeStatus(root, 500).overBudget, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/* ───────────── FA-5: no provider request id in a fixture ───────────── */

test('NO captured fixture carries a provider request id', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'captured');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const src = readFileSync(join(dir, f), 'utf8');
    assert.ok(!/req_[A-Za-z0-9]{10,}/.test(src), `${f} contains a provider request id`);
  }
});
