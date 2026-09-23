import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateBracket, findVariant, saveImage, IMAGE_DIR } from '../../../shared/bracket.mjs';
import { readRuns, lineage } from '../../../shared/variantRun.mjs';
import { compileImage } from '../../../shared/swanPromptCompiler.mjs';

/**
 * THE RECORDED-RESPONSE FIXTURE.
 *
 * This is the shape a LIVE OpenRouter /api/v1/images call returned on
 * 2026-08-12, transcribed from the observed response — not invented.
 *
 * That distinction is the whole point. The previous end-to-end test used a stub
 * I wrote myself, and I wrote it with `usage: { total_cost: ... }` because that
 * is what I believed the field was called. The production code read the same
 * wrong name. So 121 tests passed while every real generation recorded
 * costUsd: null. A self-authored stub tests your beliefs; only a recorded
 * response tests reality.
 */
const LIVE_RESPONSE_SHAPE = {
  created: 1786554435,
  data: [{ b64_json: null /* filled per-test */, media_type: 'image/png' }],
  usage: {
    prompt_tokens: 17,
    completion_tokens: 120,
    total_tokens: 137,
    cost: 0.003736,
    is_byok: false,
  },
};

function png(w, h) {
  const b = Buffer.alloc(24);
  b.writeUInt32BE(0x89504e47, 0); b.writeUInt32BE(0x0d0a1a0a, 4);
  b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20);
  return b.toString('base64');
}

/** A provider built from the RECORDED shape, with the real field names. */
function fakeProvider({ failAt = [], width = 1536, height = 864 } = {}) {
  let call = 0;
  return {
    capabilities: () => ({
      provider: 'openai/gpt-5.4-image-2', modelVersion: 'openai/gpt-5.4-image-2',
      promptStyle: 'sentence', maxPromptChars: 4000,
      supportedAspectRatios: ['1:1', '16:9', '9:16', '4:5'],
      supportsSeed: false, seedIsDeterministic: false,
      supportsImageInit: 'claimed', supportsInpainting: false,
      honorsNegativePrompt: 'claimed',
    }),
    generate: async () => {
      const i = call; call += 1;
      if (failAt.includes(i)) {
        const e = new Error('Your request was rejected by the safety system.');
        e.code = 'E_PROVIDER_SAFETY_REJECT';
        throw e;
      }
      const body = structuredClone(LIVE_RESPONSE_SHAPE);
      body.data[0].b64_json = png(width, height);
      return {
        model: 'openai/gpt-5.4-image-2',
        images: [body.data[0].b64_json],
        costUsd: body.usage.cost,          // the adapter's normalised field
        actualWidth: width, actualHeight: height,
        aspectRequested: '16:9', promptStyle: 'sentence', brainVersion: '0.2.0',
      };
    },
  };
}

const BRIEF = { briefId: 'b_bracket', text: 'a frozen lake at dawn', intent: 'hero', aspect: '16:9' };
const tmpRoot = () => mkdtempSync(join(tmpdir(), 'forge-bracket-'));

test('a bracket produces N options, each with an image ON DISK and a ledger row', async () => {
  const root = tmpRoot();
  try {
    const r = await generateBracket(BRIEF, fakeProvider(), { n: 3, root });
    assert.equal(r.ok.length, 3);
    assert.equal(r.failed, 0);

    for (const o of r.ok) {
      assert.ok(o.imageRef, 'every option must point at an image');
      assert.ok(existsSync(join(root, o.imageRef)), `image missing on disk: ${o.imageRef}`);
      assert.match(o.imageRef, /\.png$/, 'extension comes from the bytes, not a guess');
      assert.ok(o.imageSha && o.imageBytes > 0);
      // THE REGRESSION THIS FIXTURE EXISTS FOR: cost must be a real number.
      assert.equal(o.costUsd, 0.003736);
    }
    assert.equal(Number(r.costUsd.toFixed(6)), 0.011208);
    assert.equal(readRuns(root).runs.length, 3);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('NO ledger field that the live response can populate is left null', async () => {
  // S2's class, generalised: the cost bug was one field silently null. Assert the
  // whole set rather than the one that bit us.
  const root = tmpRoot();
  try {
    const { ok } = await generateBracket(BRIEF, fakeProvider(), { n: 1, root });
    const row = ok[0];
    for (const f of ['costUsd', 'wallMs', 'actualWidth', 'actualHeight', 'actualAspect',
      'imageRef', 'imageSha', 'imageBytes', 'promptText', 'promptSha', 'aspectRequested',
      'briefId', 'runId', 'provider', 'model', 'serializer', 'intent', 'createdAt']) {
      assert.ok(row[f] !== null && row[f] !== undefined, `${f} is ${row[f]} — a live response can populate it`);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('one rejected option does NOT void the bracket — 2 of 3 is still a choice', async () => {
  const root = tmpRoot();
  try {
    const r = await generateBracket(BRIEF, fakeProvider({ failAt: [1] }), { n: 3, root });
    assert.equal(r.ok.length, 2);
    assert.equal(r.failed, 1);
    const rejected = r.options.find((o) => o.status === 'safety-reject');
    assert.equal(rejected.safetyEvents[0].code, 'E_PROVIDER_SAFETY_REJECT');
    assert.equal(rejected.imageRef, null);
    // The failure is a queryable ROW, not a swallowed exception.
    assert.equal(readRuns(root).runs.length, 3);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('options are RE-ROLLS of one prompt, and the ledger says so', async () => {
  // Seeds are dead, so N options are N rolls of an identical prompt. If that is
  // not recorded, a future reader mistakes natural variance for prompt work.
  const root = tmpRoot();
  try {
    const r = await generateBracket(BRIEF, fakeProvider(), { n: 3, root });
    assert.equal(r.ok[0].intent, 'root');
    assert.deepEqual(r.ok.slice(1).map((o) => o.intent), ['reroll', 'reroll']);
    const shas = new Set(r.ok.map((o) => o.promptSha));
    assert.equal(shas.size, 1, 'all options share one prompt');
    for (const o of r.ok.slice(1)) assert.equal(o.parentVariantId, r.ok[0].variantId);
    assert.equal(lineage(r.ok[2].variantId, readRuns(root).runs).length, 2);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('the KILL-LIST is OFF by default and ON only when explicitly asked for', async () => {
  // It reaches the model through the prompt when enabled — the parameter channel
  // is dead twice over. But it ships OFF: its aesthetic effect is unmeasured, and
  // caption models can fixate on nouns they are told to avoid. Measured cost of
  // being wrong: ON-and-bad contaminates every run until the ruling; OFF-and-good
  // loses a ~7% premium. See forgeConfig.KILL_LIST_ENABLED for the gate.
  const root = tmpRoot();
  try {
    const off = await generateBracket(BRIEF, fakeProvider(), { n: 1, root });
    assert.ok(!/avoid:/i.test(off.promptText), 'default OFF');

    const on = await generateBracket({ ...BRIEF, killList: true }, fakeProvider(), { n: 1, root });
    assert.match(on.promptText, /avoid:/i);
    assert.match(on.promptText, /iridescent gradient/);
    assert.match(on.promptText, /glassmorphism/);
    assert.ok(on.ok[0].promptText.includes('avoid:'), 'and the ledger records what was actually sent');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('REGRESSION: a compiled prompt must never be re-compiled as a raw subject', async () => {
  // Found by running the real CLI, not by any unit test. `refine` fed the
  // parent's finished promptText back in as brief.text, so the compiler treated
  // a fully-rendered prompt as a SUBJECT and re-applied intent defaults, surface
  // rules and the kill-list on top of it. It was silently wrong from the start;
  // inlining the kill-list made it fail loudly, because the law filter then
  // found "iridescent gradient" sitting in the subject slot.
  const root = tmpRoot();
  try {
    // Uses the kill-list arm deliberately: a clause-bearing prompt is the one
    // that makes the double-compile fail LOUDLY, which is the behaviour worth
    // pinning. Without it the re-compile is still wrong, just silent.
    const r = await generateBracket({ ...BRIEF, killList: true }, fakeProvider(), { n: 1, root });
    const compiledPrompt = r.ok[0].promptText;
    assert.match(compiledPrompt, /avoid: .*iridescent gradient/);

    // Re-compiling it as a brief must be REFUSED, loudly, by the law filter.
    assert.throws(
      () => compileImage({ briefId: 'b_x', text: compiledPrompt, aspect: '16:9' }, fakeProvider().capabilities()),
      (e) => e.code === 'E_LAW_VIOLATION',
      'a compiled prompt fed back as a subject must be rejected, not silently double-compiled',
    );
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('findVariant resolves a short prefix and refuses an ambiguous one', async () => {
  const root = tmpRoot();
  try {
    const r = await generateBracket(BRIEF, fakeProvider(), { n: 2, root });
    const hit = findVariant(r.ok[0].variantId.slice(0, 10), root);
    assert.equal(hit.variantId, r.ok[0].variantId);
    assert.throws(() => findVariant('v_', root), /matches 2 variants/);
    assert.throws(() => findVariant('v_deadbeefdeadbeef', root), /No variant matches/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('saveImage picks the extension from the BYTES, and refuses empty payloads', () => {
  const root = tmpRoot();
  try {
    // APP0 declares length 7 = its own 2 length bytes + 'JFIF\0'. The first
    // version of this fixture declared 16 while carrying 5, so the segment
    // walker correctly stepped past the frame marker into padding and returned
    // null. The parser was right and my fixture was wrong — worth keeping,
    // because a malformed fixture reads exactly like a broken parser.
    const jpg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x07]), Buffer.from('JFIF\0', 'ascii'),
      Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x03, 0x60, 0x06, 0x00]), Buffer.alloc(8),
    ]);
    const a = saveImage('v_00000000000000aa', jpg, root);
    assert.match(a.imageRef, /\.jpg$/, 'a JPEG must not be saved as .png');
    assert.ok(existsSync(join(root, a.imageRef)));
    assert.equal(readFileSync(join(root, a.imageRef)).length, jpg.length);

    const empty = saveImage('v_00000000000000bb', '', root);
    assert.equal(empty.imageRef, null);
    assert.ok(!existsSync(join(root, IMAGE_DIR, 'v_00000000000000bb.bin')));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
