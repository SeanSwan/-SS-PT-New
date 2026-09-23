/**
 * SwanMark spec payload contract tests.
 *
 * WHY THIS FILE IS SEPARATE FROM SwanMark3D.contract.test.ts
 * ---------------------------------------------------------
 * Rule 4 caps a module at 300 lines, and the component-level suite grew past it
 * once the round-3 shading work landed. The component suite's own Rule 4 check
 * listed seven modules and skipped ITSELF, so the breach was invisible to the
 * guard meant to catch it. Splitting by subject - the shipped DATA here, the
 * COMPONENT there - keeps both files under the cap and lets each list the other.
 *
 * These are the invariants that can be decided from the payload alone: that it is
 * what the renderer reads, that it carries the fields it claims, and that the
 * inlined sRGB transfer agrees with three's own.
 */
import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import { hexToLinearRgb, srgbToLinear } from '../../three/swanMark/badgeField';

const SPEC_PATH = resolve(__dirname, '../../three/swanMark/swan-mark.mesh.json');
const spec = JSON.parse(readFileSync(SPEC_PATH, 'utf-8'));

describe('shipped spec payload', () => {
  it('declares exactly the mesh fields the renderer reads', () => {
    expect(Object.keys(spec.mesh).sort()).toEqual(
      ['triangleFacet', 'triangles', 'vertices'],
    );
  });

  it('carries no rasteriser-only fields', () => {
    // These three were pruned for a 135 KB saving. They are still emitted in the
    // CANONICAL spec for the Python rasteriser; they must never come back here.
    const raw = readFileSync(SPEC_PATH, 'utf-8');
    for (const dead of ['vertexColor', 'facetRings', 'ringFacet']) {
      expect(raw).not.toContain(dead);
    }
  });

  it('carries no facet analysis fields', () => {
    // 21 KB of diagnostics that gate_spec.py reads and the renderer never does.
    //
    // This deliberately does NOT grep the raw file text. It did at first, and it
    // failed - correctly, on a false positive: `areaPx` legitimately survives at
    // `swan.areaPx` (224,128), which is a spec-level field, not a facet field. A
    // whole-file string search cannot tell those apart. Walk the structure instead.
    const dead = ['meanColor', 'colorStd', 'colorSpread', 'centroidNorm', 'areaPx'];
    const facetKeys = new Set(spec.facets.flatMap((f: object) => Object.keys(f)));
    for (const key of dead) {
      expect(facetKeys.has(key), `facet carries ${key}`).toBe(false);
    }

    // The same fields must also be gone from every facet-bearing level of the spec,
    // except the one place `areaPx` is a legitimate spec-level measurement.
    for (const f of spec.facets) {
      expect(f).not.toHaveProperty('meanColor');
      expect(f).not.toHaveProperty('colorStd');
      expect(f).not.toHaveProperty('colorSpread');
      expect(f).not.toHaveProperty('centroidNorm');
      expect(f).not.toHaveProperty('areaPx');
    }
    // `swan.areaPx` is the documented exception - assert it so the reason is pinned.
    expect(spec.swan.areaPx).toBeGreaterThan(0);
  });

  it('gives every facet exactly the two fields the renderer reads', () => {
    for (const f of spec.facets) {
      expect(Object.keys(f).sort()).toEqual(['color', 'plane']);
    }
  });

  it('gives every facet a well-formed 9-number shading plane', () => {
    // Layout is [r0,rx,ry, g0,gx,gy, b0,bx,by]. A transposed or truncated block
    // renders a correctly-shaped but completely wrong image, so check the shape
    // AND that the values are in a sane range for sRGB 0..255.
    for (const f of spec.facets) {
      expect(f.plane).toHaveLength(9);
      for (const v of f.plane) {
        expect(Number.isFinite(v)).toBe(true);
        expect(Math.abs(v)).toBeLessThan(1000);
      }
    }
  });

  it('actually carries gradients, not a flat fallback everywhere', () => {
    // The whole point of the round-3 revision. If a future extractor run drops the
    // planes and zeroes the gradients, every shape check above still passes - this
    // fails.
    const withGradient = spec.facets.filter(
      (f: { plane: number[] }) => Math.abs(f.plane[1]) + Math.abs(f.plane[2]) > 1e-6,
    );
    expect(withGradient.length).toBeGreaterThan(spec.facets.length * 0.5);
  });

  it('has internally consistent mesh indexing', () => {
    const { vertices, triangles, triangleFacet } = spec.mesh;
    expect(triangleFacet.length).toBe(triangles.length);
    expect(vertices.length).toBeGreaterThan(1000);
    expect(triangles.length).toBeGreaterThan(1000);

    for (const t of triangles) {
      expect(t.length).toBe(3);
      for (const i of t) {
        expect(Number.isInteger(i)).toBe(true);
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(vertices.length);
      }
    }
    for (const f of triangleFacet) {
      expect(Number.isInteger(f)).toBe(true);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(spec.facets.length);
    }
  });

  it('keeps every vertex inside the normalised unit square', () => {
    for (const [x, y] of spec.mesh.vertices) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });

  it('stays under the 1 MB payload ceiling from the skill doctrine', () => {
    expect(statSync(SPEC_PATH).size).toBeLessThan(1024 * 1024);
  });
});

describe('colour transfer', () => {
  it('srgbToLinear matches THREE.Color across the whole 8-bit range', () => {
    // The per-vertex gradient path inlines the sRGB transfer because it cannot
    // allocate a THREE.Color for each of 18,885 vertices. That inlined copy has to
    // agree with three's own conversion exactly, or the swan renders subtly wrong
    // in a way no shape check would notice. This is the guard that pins it.
    for (let v = 0; v <= 255; v++) {
      const hex = '#' + v.toString(16).padStart(2, '0').repeat(3);
      const [r, g, b] = hexToLinearRgb(hex);
      const mine = srgbToLinear(v / 255);
      expect(mine).toBeCloseTo(r, 12);
      expect(mine).toBeCloseTo(g, 12);
      expect(mine).toBeCloseTo(b, 12);
    }
  });

  it('is monotonic and hits the endpoints', () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(1)).toBeCloseTo(1, 12);
    let prev = -1;
    for (let v = 0; v <= 255; v++) {
      const y = srgbToLinear(v / 255);
      expect(y).toBeGreaterThan(prev);
      prev = y;
    }
  });
});
