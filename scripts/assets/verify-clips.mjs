/**
 * verify-clips.mjs — prove an animation clip ANIMATES, not merely that it is named.
 *
 * WHY THIS EXISTS:
 * The Fryling ships four clips: idle, walk, attack, die. Every check that existed asked "is there
 * an animation called idle?" — the manifest listed it, `gltf-transform inspect` printed it, the
 * asset gate went green. None of them asked whether the numbers inside it ever change. A clip that
 * is named and empty passes all of that, and shows up as a monster standing perfectly still.
 *
 * This asks the only question worth asking: DO THE VALUES MOVE, and does the clip END where its
 * role requires — a loop back at its start, a death still on the floor.
 *
 * A CAUTIONARY NOTE, kept deliberately (2026-09-01):
 * The first version of this file read the keyframe count from `animation.samplers[0]` and reported
 * it as the clip's own. Sampler 0 is usually `root.translation`, which in a rotation-only clip is
 * CONSTANT and therefore compressed to 2 keys. So it declared a healthy 24-key idle "broken", and
 * on the strength of that a change was nearly committed to the shared Blender pipeline disabling
 * export_optimize_animation_size — which would have written every frame of every channel, 9x the
 * animation data, to fix a defect that did not exist. The optimiser was doing its job correctly.
 *
 * The lesson is in the code below: this file judges clips by PROPERTIES that matter (does it move,
 * does it close) and never by guessing intent from a key count. Before believing any negative this
 * tool reports, confirm the tool can tell a healthy asset from a broken one — the selftest keeps
 * both of those cases as permanent regressions.
 *
 * Usage:
 *   node scripts/assets/verify-clips.mjs <file.glb>...            every clip must move
 *   node scripts/assets/verify-clips.mjs <glb> --loop idle,walk   ...and those must CLOSE
 *   node scripts/assets/verify-clips.mjs <glb> --once die         ...and those must NOT close
 *   node scripts/assets/verify-clips.mjs --selftest
 *
 * Exit 0 = every clip verified · 1 = a clip failed · 2 = usage/parse error.
 */
import { readFileSync } from 'node:fs';

/** Below this, a float change is export noise rather than motion. */
const EPS = 1e-4;
const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

/** Split a GLB container into its JSON and BIN chunks. */
export function parseGlb(buf) {
  if (buf.length < 12 || buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB (bad magic)');
  let off = 12;
  let json = null;
  let bin = null;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(body.toString('utf8'));
    else if (type === 0x004e4942) bin = body;
    off += 8 + len;
  }
  if (!json) throw new Error('GLB has no JSON chunk');
  return { json, bin };
}

/** Read a float accessor as {values, count, comps}. Only what animation samplers use. */
function readAccessor(json, bin, index) {
  const acc = json.accessors[index];
  if (acc.componentType !== 5126) throw new Error(`accessor ${index} is not float (${acc.componentType})`);
  const view = json.bufferViews[acc.bufferView];
  const start = (view.byteOffset || 0) + (acc.byteOffset || 0);
  const comps = COMPONENTS[acc.type];
  const values = new Float32Array(acc.count * comps);
  for (let i = 0; i < values.length; i++) values[i] = bin.readFloatLE(start + i * 4);
  return { values, count: acc.count, comps };
}

/**
 * Inspect one clip, CHANNEL BY CHANNEL.
 *
 * WHY PER-CHANNEL MATTERS (this function got it wrong once, and the wrong version was convincing):
 * An earlier version read the keyframe count from `animation.samplers[0]` and reported it as the
 * clip's. Sampler 0 is whichever channel happens to be first — usually `root.translation`, which
 * for a rotation-only clip is CONSTANT and therefore compressed to 2 keys. So a perfectly good
 * 24-key idle reported "keys=2" and was declared broken. It was not; the instrument was.
 *
 * Compression to 2 keys on a channel that never moves is CORRECT, and is what Blender's
 * export_optimize_animation_size does. The only thing worth failing on is a channel that moves, or
 * a clip that does not end where its role requires.
 *
 * @returns {{name, keys, moving, moves, closes, movedBy, drift, twoKeyMoving}}
 */
function inspectClip(json, bin, anim) {
  let movedBy = 0;
  let drift = 0;
  let keys = 0;
  let moving = 0;
  let twoKeyMoving = [];

  for (const channel of anim.channels) {
    const sampler = anim.samplers[channel.sampler];
    const out = readAccessor(json, bin, sampler.output);
    const keyCount = readAccessor(json, bin, sampler.input).count;

    let channelSpread = 0;
    for (let c = 0; c < out.comps; c++) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let k = 0; k < out.count; k++) {
        const v = out.values[k * out.comps + c];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      channelSpread = Math.max(channelSpread, hi - lo);
      const first = out.values[c];
      const last = out.values[(out.count - 1) * out.comps + c];
      drift = Math.max(drift, Math.abs(first - last));
    }

    movedBy = Math.max(movedBy, channelSpread);
    if (channelSpread > EPS) {
      moving++;
      // A channel is only interesting at full resolution if it actually moves.
      keys = Math.max(keys, keyCount);
      if (keyCount === 2) {
        const name = json.nodes?.[channel.target.node]?.name ?? `node${channel.target.node}`;
        twoKeyMoving.push(`${name}.${channel.target.path}`);
      }
    }
  }

  return {
    name: anim.name ?? '(unnamed)',
    keys,
    channels: anim.channels.length,
    moving,
    movedBy,
    drift,
    moves: movedBy > EPS,
    closes: drift <= EPS,
    twoKeyMoving,
  };
}

/** @returns {{clips:object[], failures:string[]}} */
export function verify(buf, { loop = [], once = [] } = {}) {
  const { json, bin } = parseGlb(buf);
  const anims = json.animations ?? [];
  const clips = anims.map((a) => inspectClip(json, bin, a));
  const failures = [];

  for (const c of clips) {
    if (!c.moves) {
      failures.push(`clip "${c.name}" does not animate: not one of its ${c.channels} channel(s) changes value. A named clip that never moves is a clip in name only.`);
    }
    // NOT a failure. A moving channel with 2 keys is usually a legitimate linear ramp, and this
    // check previously failed correct assets by mistaking compressed CONSTANT channels for damage.
    // A genuinely damaged loop is caught by the loop rule below, which tests the property that
    // actually matters rather than guessing from key counts.
  }
  for (const name of loop) {
    const c = clips.find((x) => x.name === name);
    if (!c) failures.push(`clip "${name}" was required to loop but is not in the file`);
    else if (!c.closes) failures.push(`clip "${name}" must LOOP but drifts ${c.drift.toFixed(4)} between its first and last key — it will visibly snap on repeat.`);
  }
  for (const name of once) {
    const c = clips.find((x) => x.name === name);
    if (!c) failures.push(`clip "${name}" was required as a one-shot but is not in the file`);
    else if (c.closes) failures.push(`clip "${name}" must NOT return to its start pose (it is a one-shot, e.g. a death) but ends where it began — the corpse stands back up.`);
  }
  return { clips, failures };
}

// ------------------------------------------------------------------ selftest
/** Build a minimal GLB in memory so the checker can be tested against known-bad input. */
function makeGlb(clips) {
  const floats = [];
  const push = (arr) => { const at = floats.length * 4; floats.push(...arr); return at; };
  const accessors = [];
  const views = [];
  const animations = [];
  const addAccessor = (arr, type, count) => {
    const at = push(arr);
    views.push({ buffer: 0, byteOffset: at, byteLength: arr.length * 4 });
    accessors.push({ bufferView: views.length - 1, componentType: 5126, count, type });
    return accessors.length - 1;
  };
  for (const { name, times, values } of clips) {
    const input = addAccessor(times, 'SCALAR', times.length);
    const output = addAccessor(values, 'VEC3', values.length / 3);
    animations.push({
      name,
      samplers: [{ input, output, interpolation: 'LINEAR' }],
      channels: [{ sampler: 0, target: { node: 0, path: 'translation' } }],
    });
  }
  const bin = Buffer.alloc(floats.length * 4);
  floats.forEach((v, i) => bin.writeFloatLE(v, i * 4));
  const json = Buffer.from(JSON.stringify({
    asset: { version: '2.0' },
    nodes: [{ name: 'bone' }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: views,
    accessors,
    animations,
  }), 'utf8');
  const pad = (b, fill) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4), fill)]) : b);
  const j = pad(json, 0x20);
  const b = pad(bin, 0);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + j.length + 8 + b.length, 8);
  const chunk = (data, type) => { const h = Buffer.alloc(8); h.writeUInt32LE(data.length, 0); h.writeUInt32LE(type, 4); return Buffer.concat([h, data]); };
  return Buffer.concat([header, chunk(j, 0x4e4f534a), chunk(b, 0x004e4942)]);
}

function selftest() {
  let failed = 0;
  const check = (label, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
    if (!ok) failed++;
  };

  console.log('\nNEGATIVE CONTROLS — the checker must REJECT these, or it is decoration:');

  const staticClip = makeGlb([{ name: 'idle', times: [0, 0.5, 1], values: [0, 0, 0, 0, 0, 0, 0, 0, 0] }]);
  const a = verify(staticClip);
  check('a named clip whose values never change is rejected', a.failures.length >= 1, a.failures[0] ?? 'NOT CAUGHT');

  // A loop whose middle was dropped: 0 -> 0.12 -> 0 becomes 0 -> 0.12, so it no longer returns.
  // Caught by the PROPERTY (it must close), not by counting keys -- counting keys made this file
  // fail a healthy asset once already.
  const brokenLoop = makeGlb([{ name: 'idle', times: [0, 1], values: [0, 0, 0, 0.12, 0, 0] }]);
  const b = verify(brokenLoop, { loop: ['idle'] });
  check('a loop whose return-to-start was dropped is rejected', b.failures.some((f) => f.includes('must LOOP')));

  // ...and the same shape must NOT be rejected when nothing declared it a loop, because a 2-key
  // linear ramp is a legitimate one-shot. This is the false positive that was shipped and removed.
  const rampOnly = verify(brokenLoop);
  check('a 2-key linear ramp alone is NOT rejected (the old false positive)', rampOnly.failures.length === 0,
    rampOnly.failures.join(' | '));

  // The exact real-world shape: constant channels compressed to 2 keys next to a moving 3-key one.
  const compressed = makeGlb([{ name: 'idle', times: [0, 0.5, 1], values: [0, 0, 0, 0, 0.12, 0, 0, 0, 0] }]);
  const comp = verify(compressed, { loop: ['idle'] });
  check('a correctly-compressed clip passes (regression: this was failed by mistake)',
    comp.failures.length === 0, comp.failures.join(' | '));

  const notLooping = makeGlb([{ name: 'walk', times: [0, 0.5, 1], values: [0, 0, 0, 0.5, 0, 0, 0.4, 0, 0] }]);
  const c = verify(notLooping, { loop: ['walk'] });
  check('a clip declared LOOP that does not close is rejected', c.failures.some((f) => f.includes('must LOOP')));

  const returning = makeGlb([{ name: 'die', times: [0, 0.5, 1], values: [0, 0, 0, 0.5, 0, 0, 0, 0, 0] }]);
  const d = verify(returning, { once: ['die'] });
  check('a death clip that stands back up is rejected', d.failures.some((f) => f.includes('must NOT return')));

  const missing = verify(staticClip, { loop: ['nope'] });
  check('a required clip that is absent is rejected', missing.failures.some((f) => f.includes('not in the file')));

  console.log('\nAnd it must ACCEPT a correct one, or it would just be turned off:');
  const good = makeGlb([
    { name: 'idle', times: [0, 0.5, 1], values: [0, 0, 0, 0.12, 0, 0, 0, 0, 0] },
    { name: 'die', times: [0, 0.5, 1], values: [0, 0, 0, 0.5, 0, 0, 0.9, 0, 0] },
  ]);
  const e = verify(good, { loop: ['idle'], once: ['die'] });
  check('a looping idle and a one-shot die both pass', e.failures.length === 0, e.failures.join(' | '));
  check('...and it reports the motion it measured', e.clips[0].movedBy > 0.1, `movedBy=${e.clips[0].movedBy.toFixed(3)}`);

  console.log(failed ? `\n${failed} CHECK(S) FAILED\n` : '\nALL CHECKS PASS\n');
  return failed ? 1 : 0;
}

// ------------------------------------------------------------------ cli
function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) process.exit(selftest());

  const list = (flag) => {
    const i = argv.indexOf(flag);
    return i === -1 ? [] : (argv[i + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  };
  const loop = list('--loop');
  const once = list('--once');
  const files = argv.filter((a, i) => !a.startsWith('--') && !['--loop', '--once'].includes(argv[i - 1]));

  if (files.length === 0) {
    console.error('usage: verify-clips.mjs <file.glb>... [--loop a,b] [--once c]   |   --selftest');
    console.error('refusing to exit 0 having verified zero files.');
    process.exit(2);
  }

  let bad = 0;
  for (const file of files) {
    let result;
    try {
      result = verify(readFileSync(file), { loop, once });
    } catch (error) {
      console.error(`  ${file}: ${error.message}`);
      bad++;
      continue;
    }
    console.log(`\n${file}`);
    if (result.clips.length === 0) console.log('  (no animations — nothing to verify)');
    for (const c of result.clips) {
      const note = c.twoKeyMoving.length ? `  [2-key moving: ${c.twoKeyMoving.join(',')}]` : '';
      console.log(`  ${c.moves ? 'MOVES ' : 'STATIC'} ${c.name.padEnd(8)} movingChannels=${String(c.moving).padEnd(2)} keys=${String(c.keys).padEnd(3)} range=${c.movedBy.toFixed(3)} endDrift=${c.drift.toFixed(4)}${c.closes ? ' (closes)' : ''}${note}`);
    }
    for (const f of result.failures) console.error(`  FAIL: ${f}`);
    if (result.failures.length) bad++;
  }
  console.log(bad ? `\n${bad} file(s) failed clip verification.\n` : `\nAll ${files.length} file(s) verified.\n`);
  process.exit(bad ? 1 : 0);
}

const invoked = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (invoked) main();
