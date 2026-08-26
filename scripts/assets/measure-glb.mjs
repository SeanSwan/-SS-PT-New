#!/usr/bin/env node
/**
 * measure-glb.mjs — read real triangle and texture numbers out of a GLB.
 *
 * WHY THIS EXISTS (twice over)
 * ---------------------------
 * 1. A budget number with no measurement behind it is a fabricated number that
 *    acquires authority by being committed. The registry's budgetPolicy says
 *    budgets stay null until measured; this is the thing that measures.
 *
 * 2. The first attempt at measuring was WRONG and the fixture hid it. It used
 *    `POSITION.count / 3`, which is only correct for a NON-INDEXED triangle list.
 *    The proof fixture was exactly that — one non-indexed triangle — so the bug
 *    was invisible. Blender exports INDEXED meshes, so the very first real asset
 *    would have booked a wrong number carrying honest-looking provenance.
 *    Caught by GLM 5.3 on the P1 panel (2026-08-25) and confirmed with an indexed
 *    quad: 4 verts / 6 indices = 2 triangles; the old formula returned 1.333.
 *
 *    That is worse than an obviously fake number, because it is laundered: it
 *    passes the provenance gate. A measurement tool has to be right about the
 *    unit, not just present.
 *
 * PRIMITIVE MODES (glTF 2.0 §3.7.2)
 *   4 TRIANGLES (default) · 5 TRIANGLE_STRIP · 6 TRIANGLE_FAN
 *   0 POINTS · 1 LINES · 2 LINE_LOOP · 3 LINE_STRIP  -> contribute ZERO triangles
 *
 * USAGE
 *   node scripts/assets/measure-glb.mjs <file.glb> [more.glb ...]
 *   node scripts/assets/measure-glb.mjs --json <file.glb>
 *   node scripts/assets/measure-glb.mjs --selftest
 *
 *   exit 0 measured · 1 a file could not be measured · 2 bad usage
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const AS_JSON = argv.includes('--json');

const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;

/** Triangles contributed by one primitive, honouring mode and indexing. */
export function trianglesForPrimitive(gltf, prim) {
  const mode = prim.mode === undefined ? 4 : prim.mode;
  if (mode < 4) return 0; // points and lines are not triangles

  const accessorIndex = prim.indices !== undefined ? prim.indices : prim.attributes?.POSITION;
  if (accessorIndex === undefined) return 0;
  const acc = gltf.accessors?.[accessorIndex];
  if (!acc || typeof acc.count !== 'number') return 0;
  const n = acc.count;

  if (mode === 4) return Math.floor(n / 3);   // TRIANGLES
  return n >= 3 ? n - 2 : 0;                  // STRIP and FAN
}

export function parseGlb(buf) {
  if (buf.length < 20) throw new Error('too short to be a GLB');
  if (buf.readUInt32LE(0) !== GLB_MAGIC) throw new Error('not a GLB (bad magic)');
  const declared = buf.readUInt32LE(8);
  if (declared !== buf.length) throw new Error(`header length ${declared} != actual ${buf.length}`);
  const jsonLen = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== CHUNK_JSON) throw new Error('first chunk is not JSON');
  return JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
}

export function measure(buf) {
  const gltf = parseGlb(buf);
  let triangles = 0;
  let primitives = 0;
  const modes = new Set();
  for (const mesh of gltf.meshes || []) {
    for (const prim of mesh.primitives || []) {
      primitives += 1;
      modes.add(prim.mode === undefined ? 4 : prim.mode);
      triangles += trianglesForPrimitive(gltf, prim);
    }
  }
  // Embedded texture bytes: images that point at a bufferView live inside the GLB.
  let textureBytes = 0;
  for (const img of gltf.images || []) {
    if (img.bufferView !== undefined) {
      const bv = gltf.bufferViews?.[img.bufferView];
      if (bv?.byteLength) textureBytes += bv.byteLength;
    }
  }
  return {
    triangles,
    primitives,
    modes: [...modes].sort(),
    indexed: (gltf.meshes || []).some((m) => (m.primitives || []).some((p) => p.indices !== undefined)),
    textureMB: Number((textureBytes / (1024 * 1024)).toFixed(4)),
    bytes: buf.length,
  };
}

/* -------------------------------------------------------------- selftest */

function selftest() {
  const glb = (gltf, binLen = 0) => {
    let j = Buffer.from(JSON.stringify(gltf));
    while (j.length % 4) j = Buffer.concat([j, Buffer.from(' ')]);
    const bin = Buffer.alloc(binLen);
    const ch = (d, t) => { const h = Buffer.alloc(8); h.writeUInt32LE(d.length, 0); h.writeUInt32LE(t, 4); return Buffer.concat([h, d]); };
    const cj = ch(j, CHUNK_JSON); const cb = ch(bin, 0x004e4942);
    const hd = Buffer.alloc(12); hd.write('glTF', 0); hd.writeUInt32LE(2, 4); hd.writeUInt32LE(12 + cj.length + cb.length, 8);
    return Buffer.concat([hd, cj, cb]);
  };
  const mesh = (prim, accessors) => ({ asset: { version: '2.0' }, meshes: [{ primitives: [prim] }], accessors });

  const cases = [
    ['non-indexed triangle list: 3 verts = 1 tri',
      mesh({ attributes: { POSITION: 0 } }, [{ count: 3 }]), 1],
    ['INDEXED quad: 4 verts / 6 indices = 2 tris (the bug GLM caught)',
      mesh({ attributes: { POSITION: 0 }, indices: 1 }, [{ count: 4 }, { count: 6 }]), 2],
    ['indexed 40k-tri mesh reads 40000, not the vertex count',
      mesh({ attributes: { POSITION: 0 }, indices: 1 }, [{ count: 20002 }, { count: 120000 }]), 40000],
    ['TRIANGLE_STRIP mode 5: 6 indices = 4 tris',
      mesh({ attributes: { POSITION: 0 }, indices: 1, mode: 5 }, [{ count: 6 }, { count: 6 }]), 4],
    ['TRIANGLE_FAN mode 6: 6 indices = 4 tris',
      mesh({ attributes: { POSITION: 0 }, indices: 1, mode: 6 }, [{ count: 6 }, { count: 6 }]), 4],
    ['LINES mode 1 contributes 0 tris',
      mesh({ attributes: { POSITION: 0 }, indices: 1, mode: 1 }, [{ count: 8 }, { count: 8 }]), 0],
    ['POINTS mode 0 contributes 0 tris',
      mesh({ attributes: { POSITION: 0 }, mode: 0 }, [{ count: 99 }]), 0],
  ];

  let pass = 0; let fail = 0;
  for (const [name, gltf, want] of cases) {
    const got = measure(glb(gltf)).triangles;
    if (got === want) { pass += 1; console.log(`  PASS  ${name}`); }
    else { fail += 1; console.log(`  FAIL  ${name}\n        want ${want}, got ${got}`); }
  }
  // mixed primitives in one mesh
  const mixed = { asset: { version: '2.0' }, meshes: [{ primitives: [
    { attributes: { POSITION: 0 }, indices: 1 },
    { attributes: { POSITION: 0 }, indices: 1, mode: 1 },
  ] }], accessors: [{ count: 4 }, { count: 6 }] };
  const got = measure(glb(mixed)).triangles;
  if (got === 2) { pass += 1; console.log('  PASS  mixed triangle+line primitives count only the triangles'); }
  else { fail += 1; console.log(`  FAIL  mixed primitives: want 2, got ${got}`); }

  console.log(`\n[measure-glb] selftest ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
}

/* ------------------------------------------------------------------- run */

// Entry-point guard. Without it, `import { measure } from './measure-glb.mjs'` runs the
// CLI, prints usage and exits 2 — so the module can never be reused, which is exactly
// what happened the first time the manifest generator tried to import it.
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!isMain) { /* imported as a library — export only */ }
else {

if (argv.includes('--selftest')) selftest();

const files = argv.filter((a) => !a.startsWith('--'));
if (files.length === 0) {
  console.error('usage: node scripts/assets/measure-glb.mjs <file.glb> [...] [--json] [--selftest]');
  process.exit(2);
}

const out = {};
let failed = 0;
for (const f of files) {
  if (!existsSync(f) || !statSync(f).isFile()) { console.error(`[measure-glb] not a file: ${f}`); failed += 1; continue; }
  try {
    out[f] = measure(readFileSync(f));
  } catch (err) {
    console.error(`[measure-glb] ${f}: ${err.message}`);
    failed += 1;
  }
}

if (AS_JSON) console.log(JSON.stringify(out, null, 2));
else for (const [f, m] of Object.entries(out)) {
  console.log(`[measure-glb] ${f}`);
  console.log(`  triangles ${m.triangles} · primitives ${m.primitives} · modes [${m.modes}] · indexed ${m.indexed} · textureMB ${m.textureMB} · ${m.bytes} bytes`);
}
process.exit(failed ? 1 : 0);
}
