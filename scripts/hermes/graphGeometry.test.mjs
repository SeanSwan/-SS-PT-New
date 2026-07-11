/**
 * graphGeometry.test.mjs — Slice 0: proves the v2 A1 label<->camera sync contract.
 * The whole readability fix rests on HTML labels landing exactly on their SVG
 * nodes at every zoom/pan. Here we prove the two projection paths are identical.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VB_W, VB_H, VB_ASPECT, pxPerUnit, svgScreenPos, labelScreenPos, zoomToCursor,
} from './graphGeometry.mjs';

const PANZOOM = [
  { tx: 0, ty: 0, s: 1 },        // identity (Slice 1 static case)
  { tx: 120, ty: -80, s: 1 },    // pan
  { tx: 0, ty: 0, s: 2.5 },      // zoom
  { tx: -340, ty: 210, s: 3.2 }, // pan + deep zoom
  { tx: 55, ty: 5, s: 0.6 },     // zoom out
];
const NODES = [[640, 330], [300, 122], [980, 540], [0, 0], [1280, 640], [123.4, 456.7]];
const WIDTHS = [640, 1280, 2560, 3840];

test('SVG and HTML-label projections land on the SAME screen pixel at every pan/zoom (A1 proven)', () => {
  for (const w of WIDTHS) {
    for (const c of PANZOOM) {
      for (const [x, y] of NODES) {
        const a = svgScreenPos(x, y, c.tx, c.ty, c.s, w);
        const b = labelScreenPos(x, y, c.tx, c.ty, c.s, w);
        assert.ok(Math.abs(a.x - b.x) < 1e-9, `x mismatch w=${w} s=${c.s} node=${x},${y}: ${a.x} vs ${b.x}`);
        assert.ok(Math.abs(a.y - b.y) < 1e-9, `y mismatch w=${w} s=${c.s} node=${x},${y}: ${a.y} vs ${b.y}`);
      }
    }
  }
});

test('identity transform: a node maps to its plain aspect-scaled position (Slice 1 static works)', () => {
  const w = 1280; // ppu = 1
  assert.deepEqual(svgScreenPos(640, 330, 0, 0, 1, w), { x: 640, y: 330 });
  const w2 = 2560; // ppu = 2 -> aspect-locked height maps uniformly
  assert.deepEqual(svgScreenPos(640, 330, 0, 0, 1, w2), { x: 1280, y: 660 });
});

test('aspect is locked to 2:1 and ppu is uniform (the invariant the whole contract needs)', () => {
  assert.equal(VB_ASPECT, VB_W / VB_H);
  assert.equal(VB_H, 700);
  assert.equal(pxPerUnit(2560), 2);
});

test('zoom-to-cursor keeps the world point under the cursor fixed', () => {
  const w = 1280;
  const cursor = { x: 900, y: 260 };
  const prev = { tx: 40, ty: -10, s: 1.3 };
  const next = zoomToCursor(prev, cursor.x, cursor.y, 1.25, w);
  const after = svgScreenPos(
    // the world point that was under the cursor before the zoom:
    (cursor.x / pxPerUnit(w) - prev.tx) / prev.s,
    (cursor.y / pxPerUnit(w) - prev.ty) / prev.s,
    next.tx, next.ty, next.s, w,
  );
  assert.ok(Math.abs(after.x - cursor.x) < 1e-6 && Math.abs(after.y - cursor.y) < 1e-6);
  assert.ok(Math.abs(next.s - prev.s * 1.25) < 1e-9);
});
