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


/** 4x4 column-major multiply (glTF matrix convention). */
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c += 1) for (let r = 0; r < 4; r += 1) {
    let v = 0;
    for (let k = 0; k < 4; k += 1) v += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = v;
  }
  return o;
}

function trsMatrix(node) {
  if (node.matrix) return node.matrix.slice();
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const r = [
    1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w),
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w),
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y),
  ];
  return [
    r[0] * sx, r[1] * sx, r[2] * sx, 0,
    r[3] * sy, r[4] * sy, r[5] * sy, 0,
    r[6] * sz, r[7] * sz, r[8] * sz, 0,
    tx, ty, tz, 1,
  ];
}

const applyM = (m, p) => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
];

/**
 * WORLD-space AABB of every POSITION accessor, node transforms composed.
 *
 * NOT accessor min/max directly: those are LOCAL. Probed on run 17 (2026-08-26) — an unrigged
 * mesh carries Blender's Y-up conversion as a node ROTATION with local vertex data, while a
 * skinned mesh has an identity node and the conversion baked into the vertices. Comparing the
 * two local boxes said the collision hull escaped the visual mesh by 4 units when in world space
 * they are identical. A naive local-AABB rule would have blocked every rigged asset forever.
 */
export function worldAabb(gltf) {
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const visit = (idx, parent, seen) => {
    if (seen.has(idx)) return; // malformed cyclic graph: refuse to loop
    seen.add(idx);
    const node = gltf.nodes?.[idx];
    if (!node) return;
    const world = mul(parent, trsMatrix(node));
    const mesh = gltf.meshes?.[node.mesh];
    if (mesh) {
      for (const prim of mesh.primitives || []) {
        const acc = gltf.accessors?.[prim.attributes?.POSITION];
        if (!acc?.min || !acc?.max) continue;
        for (let i = 0; i < 8; i += 1) {
          const corner = [i & 1 ? acc.max[0] : acc.min[0], i & 2 ? acc.max[1] : acc.min[1], i & 4 ? acc.max[2] : acc.min[2]];
          const w = applyM(world, corner);
          for (let k = 0; k < 3; k += 1) { min[k] = Math.min(min[k], w[k]); max[k] = Math.max(max[k], w[k]); }
        }
      }
    }
    for (const child of node.children || []) visit(child, world, seen);
  };
  const roots = gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? (gltf.nodes || []).map((_, i) => i);
  for (const r of roots) visit(r, IDENT, new Set());
  return Number.isFinite(min[0]) ? { min, max } : null;
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

  // world-vs-local AABB (run 17): the same box, one via a node rotation, one baked into vertices.
  const rotated = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, rotation: [0.7071067811865476, 0, 0, 0.7071067811865476] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ count: 3, min: [0, 0, -4], max: [2, 1, 0] }] };
  const baked = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ count: 3, min: [0, 0, 0], max: [2, 4, 1] }] };
  const wa = worldAabb(rotated); const wb = worldAabb(baked);
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-6);
  if (wa && wb && near(wa.min, wb.min) && near(wa.max, wb.max)) { pass += 1; console.log('  PASS  world AABB agrees across a node rotation vs baked vertices'); }
  else { fail += 1; console.log(`  FAIL  world AABB mismatch: ${JSON.stringify(wa)} vs ${JSON.stringify(wb)}`); }

  // and it must still SEE a genuinely oversized hull
  const tall = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], accessors: [{ count: 3, min: [0, 0, 0], max: [2, 9, 1] }] };
  if (worldAabb(tall).max[1] > wb.max[1]) { pass += 1; console.log('  PASS  world AABB still detects an oversized box'); }
  else { fail += 1; console.log('  FAIL  oversized box not detected'); }

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
