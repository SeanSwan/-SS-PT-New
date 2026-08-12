import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileImage } from '../../../shared/swanPromptCompiler.mjs';
import { generate, capabilities, DEFAULT_MODEL } from '../../../shared/providers/openrouterImage.mjs';
import { appendRun, readRuns, lineage, buildRecord, refine } from '../../../shared/variantRun.mjs';

/**
 * THE COMPOSITION TEST.
 *
 * Every other suite here proves a part in isolation, and isolation is exactly
 * how this subsystem has been fooled before: `POST /generate-video` was reviewed
 * as "well-built" because its SHAPE was right, while no route existed that could
 * poll the job id it returned. Shape verified, reality not.
 *
 * So this drives the real path — compile -> generate (stubbed transport, real
 * response bytes) -> record -> ledger -> lineage — and asserts the seams.
 */

/** A real 1536x864 PNG header. Bytes, not a mock: the dimension reader parses it. */
function png(w, h) {
  const b = Buffer.alloc(24);
  b.writeUInt32BE(0x89504e47, 0);
  b.writeUInt32BE(0x0d0a1a0a, 4);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b.toString('base64');
}

function stubFetch(bodyOut, { width = 1536, height = 864, status = 200, payload } = {}) {
  return async (_url, init) => {
    bodyOut.push(JSON.parse(init.body));
    if (status !== 200) {
      return { ok: false, status, text: async () => payload };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [{ b64_json: png(width, height) }], usage: { total_cost: 0.0044 } }),
    };
  };
}

const BRIEF = { briefId: 'b-e2e', text: 'a frozen lake under low winter sun', intent: 'hero', aspect: '16:9' };

test('compile -> generate -> record -> ledger -> lineage, end to end', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-e2e-'));
  process.env.OPENROUTER_API_KEY = 'test-key-not-a-real-credential';
  try {
    const caps = capabilities(DEFAULT_MODEL);
    const compiled = compileImage(BRIEF, caps);
    const sent = [];

    const res = await generate(compiled, { root, fetchImpl: stubFetch(sent) });

    // 1. The TYPED aspect reached the API parameter — not a regex over prose.
    assert.equal(sent[0].aspect_ratio, '16:9');
    assert.equal(sent[0].model, DEFAULT_MODEL);

    // 2. Seed is NOT sent while the capability is merely 'claimed'.
    assert.equal(Object.hasOwn(sent[0], 'seed'), false);
    assert.equal(res.seedSent, null);

    // 3. The provider MEASURED what came back instead of trusting its request.
    assert.equal(res.actualWidth, 1536);
    assert.equal(res.actualHeight, 864);
    assert.equal(res.actualFormat, 'png');
    assert.equal(res.aspectDeviation, 0);
    assert.equal(res.aspectOutOfTolerance, false);

    // 4. The result feeds a record with no hand-massaging.
    const round1 = appendRun({
      briefId: compiled.briefId, provider: res.model, model: res.model,
      brainVersion: res.brainVersion, serializer: res.promptStyle,
      promptText: compiled.promptText, seedRequested: res.seedSent,
      aspectRequested: res.aspectRequested,
      actualWidth: res.actualWidth, actualHeight: res.actualHeight,
      costUsd: res.usage?.total_cost ?? null, status: 'ok',
      // Pinned so the "a child does not inherit its parent's timestamp"
      // assertion below is deterministic — two fresh ISO stamps can land in the
      // same millisecond and make that check pass or fail by luck.
      createdAt: '2026-01-01T00:00:00.000Z',
    }, root);

    assert.equal(round1.actualAspect, 1.7778);
    assert.equal(round1.brainVersion, '0.2.0');
    assert.equal(round1.serializer, 'sentence');

    // 5. A refinement round points BACK at its parent — the whole game.
    // Built with refine(), not a spread: a spread inherits the parent's
    // createdAt and its per-generation evidence.
    const round2 = appendRun(refine(round1, {
      promptText: `${compiled.promptText}, warmer`,
      status: 'ok',
    }), root);
    assert.equal(round2.parentVariantId, round1.variantId);
    assert.notEqual(round2.variantId, round1.variantId);
    assert.notEqual(round2.createdAt, round1.createdAt);
    assert.equal(round2.costUsd, null, 'a child must not inherit its parent evidence');
    assert.equal(round2.actualWidth, null);

    const { runs, skipped } = readRuns(root);
    assert.equal(runs.length, 2);
    assert.equal(skipped, 0);
    const chain = lineage(round2.variantId, runs);
    assert.deepEqual(chain.map((r) => r.variantId), [round2.variantId, round1.variantId]);
  } finally {
    delete process.env.OPENROUTER_API_KEY;
    rmSync(root, { recursive: true, force: true });
  }
});

test('a PROBE may send a seed explicitly, and what was sent is what is recorded', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key-not-a-real-credential';
  try {
    const compiled = compileImage(BRIEF, capabilities(DEFAULT_MODEL));
    const sent = [];
    const res = await generate(compiled, { root: '.', fetchImpl: stubFetch(sent), seed: 424242 });
    assert.equal(sent[0].seed, 424242);
    assert.equal(res.seedSent, 424242);
    // The capability is still unproven — sending a parameter is not evidence it
    // was honoured. Only a repeat-generation probe may promote it.
    assert.equal(capabilities(DEFAULT_MODEL).seedIsDeterministic, 'claimed');
  } finally { delete process.env.OPENROUTER_API_KEY; }
});

test('a CLAMPED response is measured and flagged rather than silently accepted', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key-not-a-real-credential';
  try {
    const compiled = compileImage(BRIEF, capabilities(DEFAULT_MODEL));
    // The wrong-endpoint failure mode: a square for a cinematic brief.
    const res = await generate(compiled, {
      root: '.', fetchImpl: stubFetch([], { width: 1024, height: 1024 }),
    });
    assert.equal(res.actualWidth, 1024);
    assert.equal(res.aspectDeviation, 0.4375);
    assert.equal(res.aspectOutOfTolerance, true);
  } finally { delete process.env.OPENROUTER_API_KEY; }
});

test('a SAFETY rejection is still surfaced as its own code, and is recordable', async () => {
  process.env.OPENROUTER_API_KEY = 'test-key-not-a-real-credential';
  try {
    const compiled = compileImage(BRIEF, capabilities(DEFAULT_MODEL));
    await assert.rejects(
      generate(compiled, {
        root: '.',
        fetchImpl: stubFetch([], { status: 400, payload: 'Your request was rejected by the safety system.' }),
      }),
      (e) => e.code === 'E_PROVIDER_SAFETY_REJECT',
    );
    // The measured 60% tag-rejection rate becomes a queryable row, not a paragraph.
    const rec = buildRecord({
      briefId: 'b-e2e', provider: DEFAULT_MODEL, model: DEFAULT_MODEL,
      serializer: 'tag', status: 'safety-reject',
      safetyEvents: [{ code: 'E_PROVIDER_SAFETY_REJECT', httpStatus: 400 }],
    });
    assert.equal(rec.status, 'safety-reject');
  } finally { delete process.env.OPENROUTER_API_KEY; }
});
