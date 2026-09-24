/*
 * constellation-scene-parts.ts — the pieces `constellation-three.ts` builds WITH.
 *
 * WHY THIS FILE EXISTS. `constellation-three.ts` crossed this package's Rule 4
 * cap (300 lines, ban 14) when the camera framing stopped being a hardcoded `z`
 * and became a solved distance. The rule is explicit that the cap is met by
 * extracting at a seam, never by trimming the reasoning out of comments — and
 * the reasoning in that file is the part that stops the framing defect coming
 * back.
 *
 * The seam is "what the scene is made of" vs "what the scene does over time".
 * Everything here is a pure constructor or a closed-form calculation: it takes
 * numbers and returns geometry, or takes numbers and returns a number. None of
 * it holds state, none of it touches the render loop, and none of it can change
 * a frame timing. That is what makes it safe to move.
 *
 * The state that DOES change per frame — the mesh map, the group, the dolly
 * clock, the focus ring — stays in `constellation-three.ts` where the behaviour
 * is. A reader who wants to know how the constellation moves never needs this
 * file; a reader who wants to know what it is drawn from never needs that one.
 */

import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  SphereGeometry,
  WebGLRenderer,
} from 'three';
import { nodeRadius, type BrainNode } from './constellation-layout';

/**
 * The vertical field of view, in DEGREES — the camera constructor's own unit.
 * Q5 (Astra 140126): the fit used the radians form while `PerspectiveCamera`
 * hardcoded `55` separately; they agreed by coincidence of two literals. One
 * constant, two derived forms, so they cannot drift.
 */
export const VFOV_DEG = 55;

/** The vertical field of view, in radians, shared by the camera and the fit.
 *
 * It lives here rather than as a literal in two places because a fit computed
 * against a FOV the camera does not use is silently wrong in a way that looks
 * like a bad framing choice rather than a bug.
 */
export const VFOV = (VFOV_DEG * Math.PI) / 180;

/** Keeps the largest sphere from touching the frame edge. */
export const FIT_MARGIN = 1.18;

/** How far past a node's SPHERE its coverage arc reaches (makeArc's radius). */
export const ARC_OVERSIZE = 1.6;

/** How far the focus ring reaches past the sphere. */
export const RING_OVERSIZE = 1.35;

/**
 * Distance from the origin at which a sphere fits the camera on BOTH axes.
 *
 * WHY THIS IS SOLVED AND NOT CHOSEN. A fixed distance crops the constellation
 * on any panel whose aspect ratio differs from the one it was tuned on — and
 * because a node at the near pole sits much closer to the camera than one at
 * the far pole, it crops the near hemisphere even when the layout sphere itself
 * would fit. Both were visible in the first S5 render (nodes clipped at the
 * bottom and left of a 1040x560 panel). Nudging the constant does not fix it:
 * the panel is resizable and the roster size varies.
 *
 * The tighter axis wins, so a tall narrow panel and a wide short one both frame
 * correctly.
 */
export function distanceToFit(sceneRadius: number, aspect: number): number {
  const need = sceneRadius * FIT_MARGIN;
  const vHalf = Math.tan(VFOV / 2);
  const hHalf = vHalf * aspect;
  return Math.max(need / vHalf, need / hHalf);
}

/**
 * A per-scene sphere-geometry cache, quantised by radius.
 *
 * Quantisation is the point: without it a re-layout allocates one geometry per
 * node per render, which is the regression the T-E3 budget harness exists to
 * catch. Four steps per unit is finer than the size encoding needs and coarse
 * enough that a 40-node roster settles on a handful of shared geometries.
 *
 * The returned function carries its own `dispose()` because the cache OUTLIVES
 * no individual node: when the scene tears down, the geometries are still live
 * GPU allocations that nothing else holds a reference to. T-T2 asserts "remount
 * → clean teardown (no leaked context)", and a cache the caller cannot reach
 * would leak one geometry per distinct node radius per remount. Handing back a
 * bare function and expecting the caller to reconstruct the map is how that
 * leak happens.
 */
export interface GeometryCache {
  (r: number): SphereGeometry;
  /** Release every cached geometry. Safe to call twice. */
  dispose: () => void;
}

export function createGeometryCache(): GeometryCache {
  const cache = new Map<number, SphereGeometry>();
  const sphereFor = ((r: number) => {
    const key = Math.round(r * 4) / 4;
    let g = cache.get(key);
    if (!g) {
      g = new SphereGeometry(key, 16, 12);
      cache.set(key, g);
    }
    return g;
  }) as GeometryCache;
  sphereFor.dispose = () => {
    for (const g of cache.values()) g.dispose();
    cache.clear();
  };
  return sphereFor;
}

/**
 * A static star field. Decorative, data-free, never animated.
 *
 * "Data-free" is load-bearing: it is part of the Vault Observatory frame, not a
 * signal, so it must never encode anything. The placement is a deterministic
 * hash of the index, so the field is byte-identical on every load and a
 * screenshot diff means a real change rather than a reshuffled background.
 */
export function makeDust(): Points {
  const N = 420;
  const pts = new Float32Array(N * 3);
  for (let i = 0; i < N; i += 1) {
    const a = (i * 2.39996) % (Math.PI * 2);
    const b = ((i * 0.6180339887) % 1) * 2 - 1;
    const r = 260 + ((i * 37) % 120);
    const ring = Math.sqrt(Math.max(0, 1 - b * b));
    pts[i * 3] = Math.cos(a) * ring * r;
    pts[i * 3 + 1] = b * r;
    pts[i * 3 + 2] = Math.sin(a) * ring * r;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pts, 3));
  return new Points(g, new PointsMaterial({
    color: '#4070C0',
    size: 1.6,
    transparent: true,
    opacity: 0.5,
    blending: AdditiveBlending,
    sizeAttenuation: true,
  }));
}

/**
 * The arc's VERTEX BUFFER, baked from `n.arc` (the sweep in radians).
 *
 * Moved here from `constellation-three.ts` at the file's own stated seam —
 * "what the scene is made of" vs "what it does over time" — because that file
 * sits AT the Rule 4 cap and D4/D5/D6 needed the headroom. Sharing it between
 * creation and update is the D2 fix: one implementation, two callers, no drift
 * (the D2 defect was exactly an update path that never ran this at all).
 */
export function buildArcGeometry(n: BrainNode): BufferGeometry {
  const r = nodeRadius(n.size) * ARC_OVERSIZE;
  const seg = 48;
  const pts: number[] = [];
  for (let i = 0; i <= seg; i += 1) {
    const a = (i / seg) * n.arc - Math.PI / 2;
    pts.push(Math.cos(a) * r, Math.sin(a) * r, 0);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pts, 3));
  return g;
}

/** The arc is the coverage ring: `arc ∝ coverage`, drawn as a line loop. */
export function makeArc(n: BrainNode): Line {
  const line = new Line(
    buildArcGeometry(n),
    new LineBasicMaterial({ color: '#E0ECF4', transparent: true, opacity: 0.55 }),
  );
  line.visible = n.coverage !== null && n.coverage > 0;
  return line;
}

/**
 * Live renderer/camera numbers — the REAL-scene observations Astra 140126 D1
 * asked for ("replace the allocation and dolly assertions with observations of
 * real scene allocations and camera behaviour").
 *
 * jsdom cannot produce these: `renderer.info` belongs to a constructed
 * WebGLRenderer and camera position only moves under a real frame loop. The
 * browser bench (`web/bench/frame-bench.mjs`) calls this after updates and
 * across the entry dolly, so allocation growth and camera motion are measured
 * on the shipping scene instead of asserted on an empty-layout deep-equality.
 */
export function makeDiagnostics(
  renderer: WebGLRenderer,
  camera: PerspectiveCamera,
): () => { geometries: number; textures: number; drawCalls: number; cameraZ: number } {
  return () => ({
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    drawCalls: renderer.info.render.calls,
    cameraZ: camera.position.z,
  });
}
