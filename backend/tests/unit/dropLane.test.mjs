import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { compileImage } from '../../../shared/swanPromptCompiler.mjs';
import {
  capabilities as dropCaps, requestDrop, awaitDrop, consumeDrop,
  READY_DIR, CONSUMED_DIR, REQUEST_DIR,
} from '../../../shared/providers/dropFolderImage.mjs';
import { appendRun, readRuns } from '../../../shared/variantRun.mjs';
import { saveImage } from '../../../shared/bracket.mjs';
import { imageDimensions } from '../../../shared/imageDimensions.mjs';

/**
 * THE ZERO-COST LANE, EXERCISED END TO END.
 *
 * Kimi: "Zero-cost lane is your best quality-iteration tool IF REAL; dead code
 * otherwise. Run one full bracket through it, or delete the module."
 *
 * The human step (open ChatGPT, generate, save the file) cannot happen inside a
 * test, so it is SCRIPTED here — the test writes the file a person would drop.
 * Everything either side of that step is the real code path: the request sheet a
 * human actually reads, the ready-folder poll, the archive-on-consume, and a
 * ledger row with the same shape the paid lane writes.
 *
 * What this does NOT prove: that a human will ever use it. That is Sean's call,
 * not something a test can assert — but the mechanism is no longer unexercised.
 */

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return (buf) => { let c = -1; for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
})();
function chunk(ty, body) {
  const l = Buffer.alloc(4); l.writeUInt32BE(body.length, 0);
  const td = Buffer.concat([Buffer.from(ty, 'ascii'), body]);
  const c = Buffer.alloc(4); c.writeUInt32BE(CRC(td), 0);
  return Buffer.concat([l, td, c]);
}
/** The file a human would save out of an image tool. */
function humanImage(w = 32, h = 18) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y += 1) {
    const off = y * (w * 3 + 1);
    for (let x = 0; x < w; x += 1) {
      const p = off + 1 + x * 3;
      raw[p] = 0; raw[p + 1] = 32; raw[p + 2] = 96;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BRIEF = { briefId: 'b_drop', text: 'a frozen lake at dawn', intent: 'hero', aspect: '16:9' };
const tmpRoot = () => mkdtempSync(join(tmpdir(), 'forge-drop-'));

test('the drop lane runs END TO END: request -> human drops -> consume -> ledger', async () => {
  const root = tmpRoot();
  try {
    const caps = dropCaps();
    assert.equal(caps.costCents, 0, 'the entire point of this lane');
    const compiled = compileImage(BRIEF, caps);

    // 1. the sheet a person actually reads
    const { id, requestPath } = requestDrop(compiled, root);
    const sheet = readFileSync(join(root, requestPath), 'utf8');
    assert.match(sheet, /aspect ratio: \*\*16:9\*\*/, 'a clean ratio, not a prose blob');
    assert.ok(sheet.includes(compiled.promptText), 'the exact prompt to paste');
    assert.match(sheet, new RegExp(`${id}\\.png`), 'and what to name the file');

    // 2. THE HUMAN STEP, scripted: they save the image into ready/
    writeFileSync(join(root, READY_DIR, `${id}.png`), humanImage());

    // 3. the poll finds it
    // NOTE an API wart: awaitDrop takes an options OBJECT while its sibling
    // consumeDrop takes positional args. Flagged, not churned — there are no
    // other callers yet, so the cost of fixing it is lower later than the risk
    // of changing a signature mid-slice.
    const found = await awaitDrop({ id, root, timeoutMs: 500, intervalMs: 20 });
    assert.equal(found.ready, true);

    // 4. consume archives it out of ready/ so it cannot be double-ingested
    const got = consumeDrop(id, root);
    assert.ok(got.bytes.length > 0);
    assert.deepEqual(imageDimensions(got.bytes), { width: 32, height: 18, format: 'png' });
    assert.equal(existsSync(join(root, READY_DIR, `${id}.png`)), false, 'moved out of ready/');
    assert.equal(readdirSync(join(root, CONSUMED_DIR)).length, 1, 'and archived, not deleted');

    // 5. a ledger row with the SAME shape the paid lane writes
    const img = saveImage('v_00000000000000dd', got.bytes, root);
    const rec = appendRun({
      briefId: BRIEF.briefId, runId: 'r_drop', provider: caps.provider, model: caps.modelVersion,
      brainVersion: compiled.brainVersion, serializer: compiled.promptStyle,
      promptText: compiled.promptText, aspectRequested: compiled.aspect,
      actualWidth: 32, actualHeight: 18, costUsd: 0, wallMs: 1,
      status: 'ok', intent: 'root', ...img,
    }, root);

    assert.equal(rec.costUsd, 0, 'zero-cost lane records zero, not null');
    assert.ok(rec.imageRef && existsSync(join(root, rec.imageRef)));
    assert.equal(readRuns(root).runs.length, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('awaitDrop RETURNS on timeout instead of hanging forever', async () => {
  const root = tmpRoot();
  try {
    const compiled = compileImage(BRIEF, dropCaps());
    const { id } = requestDrop(compiled, root);
    const r = await awaitDrop({ id, root, timeoutMs: 120, intervalMs: 20 });
    assert.equal(r.ready, false, 'a human who never drops must not deadlock the caller');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('consumeDrop REFUSES when nothing was dropped', () => {
  const root = tmpRoot();
  try {
    const compiled = compileImage(BRIEF, dropCaps());
    const { id } = requestDrop(compiled, root);
    assert.throws(() => consumeDrop(id, root), (e) => e.code === 'E_NOT_READY');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a hostile briefId cannot escape the request directory', () => {
  // Path traversal was a real hole here: `../../escaped` interpolated into a
  // join() wrote outside the requests dir. Allowlist, not blocklist.
  const root = tmpRoot();
  try {
    const compiled = compileImage({ ...BRIEF, briefId: '../../escaped' }, dropCaps());
    const { id, requestPath } = requestDrop(compiled, root);
    assert.ok(!id.includes('..') && !id.includes('/') && !id.includes('\\'), `unsafe id: ${id}`);
    assert.ok(requestPath.startsWith(REQUEST_DIR), 'written inside the requests dir');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
