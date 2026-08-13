import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  withRetry, retryAfterMs, JITTER_FRACTION, TOTAL_BUDGET_MS,
} from '../../../shared/providers/transportRetry.mjs';
import { generateBracket, storeStatus, IMAGE_DIR } from '../../../shared/bracket.mjs';
import { buildContactSheet, MAX_INLINE_BYTES } from '../../../shared/contactSheet.mjs';

/** A response stub good enough for the retry policy to reason about. */
const resp = (status, headers = {}) => ({
  ok: status < 400, status,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
});

/* ───────────────────────── FA-1: retry policy ───────────────────────── */

test('JITTER decorrelates waits — a bracket does not re-flatten a recovering provider', async () => {
  // A fixed backoff synchronises every client that failed at the same instant,
  // so they all return together. The only herd this system creates is a
  // bracket's own options; +/-25% is enough to break it up.
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

test('RETRY-AFTER from the provider beats the local backoff table', async () => {
  // A provider that tells you when to come back knows more than your table does.
  const waits = [];
  let call = 0;
  await withRetry(async () => (call++ === 0 ? resp(503, { 'retry-after': '7' }) : resp(200)), {
    sleep: async (ms) => waits.push(ms), random: () => 0.5, maxRetries: 1,
  });
  assert.deepEqual(waits, [7000], 'honoured 7s, not the 1s table value');
});

test('a hostile or absurd Retry-After is CLAMPED, not obeyed', () => {
  // A broken or malicious header must not be able to park the process.
  assert.equal(retryAfterMs(resp(503, { 'retry-after': '999999' })), TOTAL_BUDGET_MS);
  assert.equal(retryAfterMs(resp(503, { 'retry-after': 'not-a-number' })), null);
  assert.equal(retryAfterMs(resp(503, {})), null);
  assert.equal(retryAfterMs(null), null);
  // HTTP-date form
  const at = new Date(Date.now() + 5000).toUTCString();
  const ms = retryAfterMs(resp(503, { 'retry-after': at }), Date.now());
  assert.ok(ms >= 3000 && ms <= 6000, `date form should be ~5s, got ${ms}`);
});

test('the TOTAL BUDGET stops a retry chain BEFORE it sleeps past the limit', async () => {
  // A budget only checked after sleeping is not a budget.
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

function pricedProvider(costPer) {
  return {
    capabilities: () => ({
      provider: 'p', modelVersion: 'm', promptStyle: 'sentence', maxPromptChars: 4000,
      supportedAspectRatios: ['16:9'], honorsNegativePrompt: 'claimed',
    }),
    generate: async () => ({
      model: 'm', images: [''], costUsd: costPer, actualWidth: 16, actualHeight: 9,
      aspectRequested: '16:9', promptStyle: 'sentence', brainVersion: '0.2.0', retries: 0,
    }),
  };
}

const BRIEF = { briefId: 'b_fa', text: 'a frozen lake at dawn', intent: 'hero', aspect: '16:9' };
const tmpRoot = () => mkdtempSync(join(tmpdir(), 'forge-fa-'));

test('the SPEND CEILING stops the bracket rather than the wallet', async () => {
  const root = tmpRoot();
  try {
    // Each option costs 0.04; a 0.10 ceiling permits three then refuses the rest.
    const r = await generateBracket(BRIEF, pricedProvider(0.04), { n: 6, root, maxSpendUsd: 0.10 });
    assert.equal(r.ceilingHit, true);
    assert.ok(r.ok.length < 6, 'it stopped early');
    assert.ok(r.costUsd <= 0.10 + 0.04, 'and overshot by at most one option');
    const stopper = r.options.find((o) => String(o.notes || '').startsWith('E_SPEND_CEILING'));
    assert.ok(stopper, 'the stop is a queryable ledger row, not a silent break');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('an ordinary bracket never notices the ceiling', async () => {
  const root = tmpRoot();
  try {
    const r = await generateBracket(BRIEF, pricedProvider(0.004), { n: 3, root });
    assert.equal(r.ceilingHit, false);
    assert.equal(r.ok.length, 3);
    assert.equal(r.ceilingUsd, 0.50);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/* ───────────────── FA-2: contact-sheet inline size cap ───────────────── */

test('the contact sheet LINKS images once the inline budget is spent', () => {
  // A sheet that will not open in a browser tab is not a contact sheet.
  const root = tmpRoot();
  try {
    mkdirSync(join(root, IMAGE_DIR), { recursive: true });
    const rows = [];
    for (let i = 0; i < 3; i += 1) {
      const id = `v_00000000000000a${i}`;
      writeFileSync(join(root, IMAGE_DIR, `${id}.png`), Buffer.alloc(200_000));
      rows.push({
        status: 'ok', variantId: id, intent: 'root', promptText: 'p', costUsd: 0.004,
        wallMs: 1, actualWidth: 16, actualHeight: 9,
        imageRef: `${IMAGE_DIR.split(/[\\/]/).join('/')}/${id}.png`,
      });
    }
    // Budget fits roughly one 200KB image once base64 inflates it by ~33%.
    const html = buildContactSheet(rows, root, { maxInlineBytes: 300_000 });
    const inlined = (html.match(/src="data:/g) || []).length;
    const linked = (html.match(/src="images\//g) || []).length;
    assert.equal(inlined, 1, 'one inlined within budget');
    assert.equal(linked, 2, 'the rest linked from beside the file');
    assert.match(html, /linked rather than inlined/, 'and the sheet SAYS so');
    assert.ok(html.length < 400_000, `sheet stayed small: ${html.length}`);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('the default budget is stated in megabytes a human recognises', () => {
  assert.equal(MAX_INLINE_BYTES, 6 * 1024 * 1024);
});

/* ─────────────────── FA-3: retention actually runs ─────────────────── */

test('storeStatus WALKS THE WHOLE ROOT — a sibling directory cannot hide from retention', () => {
  // It counted only forge-runs/images/ and reported 3.6 MB while 14.1 MB sat on
  // disk: the A/B harness writes to a sibling directory retention never saw. A
  // budget that guards one subdirectory is a budget-shaped object.
  const root = tmpRoot();
  try {
    mkdirSync(join(root, IMAGE_DIR), { recursive: true });
    mkdirSync(join(root, IMAGE_DIR, '..', 'ab-avoid'), { recursive: true });
    writeFileSync(join(root, IMAGE_DIR, 'a.png'), Buffer.alloc(1_048_576));
    writeFileSync(join(root, IMAGE_DIR, '..', 'ab-avoid', 'b.png'), Buffer.alloc(1_048_576));
    const st = storeStatus(root, 500);
    assert.equal(st.files, 2, 'both directories counted');
    assert.equal(st.mb, 2);
    assert.deepEqual(st.dirs, ['ab-avoid', 'images'], 'and it names where they live');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('storeStatus MEASURES the store — retention is checked, not merely documented', () => {
  const root = tmpRoot();
  try {
    // `dirs` was added when the walk widened to the whole root; an empty store
    // reports an empty list rather than omitting the field.
    assert.deepEqual(storeStatus(root), { files: 0, mb: 0, budgetMb: 500, overBudget: false, dirs: [] });
    mkdirSync(join(root, IMAGE_DIR), { recursive: true });
    writeFileSync(join(root, IMAGE_DIR, 'a.png'), Buffer.alloc(1_048_576));
    writeFileSync(join(root, IMAGE_DIR, 'b.png'), Buffer.alloc(1_048_576));
    const st = storeStatus(root, 1);
    assert.equal(st.files, 2);
    assert.equal(st.mb, 2);
    assert.equal(st.overBudget, true);
    assert.equal(st.overBudget, true, 'over a 1MB budget');
    assert.equal(storeStatus(root, 500).overBudget, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/* ───────────── FA-5: no provider request id in a fixture ───────────── */

test('NO captured fixture carries a provider request id', async () => {
  // Not a credential, but a real identifier from a real account — and git is
  // permanent. Scrubbed at capture time so it cannot depend on anyone remembering.
  const { readFileSync, readdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'captured');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const src = readFileSync(join(dir, f), 'utf8');
    assert.ok(!/req_[A-Za-z0-9]{10,}/.test(src), `${f} contains a provider request id`);
  }
});
