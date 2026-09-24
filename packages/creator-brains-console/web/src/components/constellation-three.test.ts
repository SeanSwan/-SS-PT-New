/*
 * constellation-three.test.ts — the scene's adjudicated defects (Astra 140126):
 *   D2 — coverage arcs freeze at their creation sweep (fixed; regression-pinned)
 *   D5 — the camera fit excludes the arcs it must display (bounding bound is
 *        sphere-only while arcs reach 1.6r and the focus ring 1.35r, against a
 *        FIT_MARGIN of 1.18 — clipping is arithmetically necessary)
 *   D6 — picking can select an entirely occluded node (insertion-order tie-break
 *        on projected centres; no radius, no depth)
 *
 * HOW THESE TESTS SEE THE SCENE WITHOUT A WEBGL CONTEXT.
 *
 *   `createScene` needs a `WebGLRenderer`, which jsdom cannot construct — so the
 *   test mocks exactly that ONE class and lets the real `three` geometry, scene
 *   graph and camera run. The fake mirrors the real renderer's two obligations
 *   that a scene test depends on: it refreshes world matrices before recording
 *   what it was handed (projection and raycasting both read `matrixWorld`), and
 *   it captures scene + camera so assertions reach the actual vertices a browser
 *   frame would draw — not a copy, not a source-text grep.
 *
 * RED FIRST: each defect's test fails on the unfixed tree (recorded in the
 * adjudication round); fixing the cited branch flips it green; deleting the fix
 * turns it red again (mutation controls, run in both directions).
 */
import { describe, expect, it, vi } from 'vitest';

const captured: { scene: unknown; camera: unknown } = { scene: null, camera: null };

vi.mock('three', async (orig) => {
  const actual = await orig() as Record<string, unknown>;
  class FakeWebGLRenderer {
    constructor(_opts?: unknown) { /* canvas ignored: no context in jsdom */ }
    setClearColor(): void { /* noop */ }
    setPixelRatio(): void { /* noop */ }
    setSize(): void { /* noop */ }
    render(scene: { updateMatrixWorld?: (force?: boolean) => void }, camera: { updateMatrixWorld?: (force?: boolean) => void }): void {
      // The real renderer refreshes matrices as part of render(); a fake that
      // skipped this would leave projection/raycast on stale matrices and make
      // depth-dependent assertions pass or fail for the wrong reason.
      scene.updateMatrixWorld?.(true);
      camera.updateMatrixWorld?.(true);
      captured.scene = scene;
      captured.camera = camera;
    }
    dispose(): void { /* noop */ }
    forceContextLoss(): void { /* noop */ }
  }
  return { ...actual, WebGLRenderer: FakeWebGLRenderer };
});

import { Line, Vector3, type LineBasicMaterial, type PerspectiveCamera, type Scene } from 'three';
import type { BrainNode } from './constellation-layout';
import { createScene } from './constellation-three';

const node = (channelId: string, coverage: number | null, arc: number): BrainNode => ({
  channelId,
  title: 'T',
  size: 0.5,
  coverage,
  arc,
  state: 'on',
  position: { x: 1.2, y: 0, z: 0 },
  enabled: true,
  videos: 10,
  fetched: coverage === null ? null : Math.round(coverage * 10),
});

/** The arc Line currently in the scene graph, or null. */
function arcLine(): Line | null {
  const scene = captured.scene as Scene | null;
  if (!scene) return null;
  const root = scene.children[0];
  if (!root) return null;
  return (root.children.find((c): c is Line => c instanceof Line)) ?? null;
}

/** Last vertex of the arc's position buffer — the sweep's end point. */
function lastVertex(line: Line): { x: number; y: number } {
  const attr = line.geometry.getAttribute('position');
  const i = attr.count - 1;
  return { x: attr.getX(i), y: attr.getY(i) };
}

describe('D2 coverage arcs are rewritten on update, not frozen at creation', () => {
  it('50% -> 100% coverage rewrites the existing arc vertices (full ring, not a stale half-circle)', () => {
    const canvas = document.createElement('canvas');
    const handle = createScene(canvas, { entryDolly: false });

    // Creation at arc = PI (a half ring): sweep ends at angle PI - PI/2 = PI/2,
    // i.e. the top of the ring: y > 0.
    handle.update([node('c1', 0.5, Math.PI)]);
    handle.frame(16);
    const half = arcLine();
    expect(half).not.toBeNull();
    const before = lastVertex(half as Line);
    expect(before.y).toBeGreaterThan(0); // precondition: half-ring ends at top

    // The SAME node grows to full coverage — the existing branch, not creation.
    handle.update([node('c1', 1, Math.PI * 2)]);
    handle.frame(16);
    const grown = arcLine();
    expect(grown).not.toBeNull();

    // Full ring: sweep ends at 2PI - PI/2 = 3PI/2, i.e. the BOTTOM: y < 0.
    // Pre-fix the geometry object still holds the half-ring vertices, y > 0.
    const after = lastVertex(grown as Line);
    expect(after.y).toBeLessThan(0);

    handle.dispose();
  });

  it('coverage -> null hides the arc of an existing node (visibility half of the same branch)', () => {
    const canvas = document.createElement('canvas');
    const handle = createScene(canvas, { entryDolly: false });
    handle.update([node('c2', 0.9, Math.PI * 1.8)]);
    handle.frame(16);
    expect(arcLine()?.visible).toBe(true);

    handle.update([node('c2', null, 0)]);
    handle.frame(16);
    expect(arcLine()?.visible).toBe(false);

    handle.dispose();
  });
});

describe('D5 the camera fit includes what the scene actually draws', () => {
  it('a full-coverage node AT THE ORIGIN projects its whole arc inside the frame (square panel)', () => {
    const canvas = document.createElement('canvas');
    const handle = createScene(canvas, { entryDolly: false });
    // Astra's worked case: single node at the origin, arc = full circle,
    // square viewport, dolly disabled. Pre-fix the bound was hypot + r (margin
    // 1.18) while the arc reaches 1.6r → NDC ≈ 1.36 → clipped, necessarily.
    handle.update([{ ...node('solo', 1, Math.PI * 2), position: { x: 0, y: 0, z: 0 } }]);
    handle.resize(560, 560);
    handle.frame(16);

    const line = arcLine();
    expect(line).not.toBeNull();
    const camera = captured.camera as PerspectiveCamera;
    expect(camera).not.toBeNull();
    const attr = (line as Line).geometry.getAttribute('position');
    let maxAbs = 0;
    for (let i = 0; i < attr.count; i += 1) {
      const v = new Vector3(attr.getX(i), attr.getY(i), 0)
        .add((line as Line).position)
        .project(camera);
      maxAbs = Math.max(maxAbs, Math.abs(v.x), Math.abs(v.y));
    }
    expect(maxAbs).toBeLessThanOrEqual(1.001);

    handle.dispose();
  });
});

describe('D6 pick answers with GEOMETRY — front beats rear, depth decides', () => {
  it('returns the FRONT sphere when one occludes the other on screen', () => {
    const handle = createScene(document.createElement('canvas'), { entryDolly: false });
    const rear = { ...node('rear', null, 0), position: { x: 0, y: 0, z: -6 } };
    const front = { ...node('front', null, 0), position: { x: 0, y: 0, z: 6 } };
    // REAR INSERTED FIRST: pre-fix pick() walked insertion order over equal
    // projected centres and returned 'rear' — the fully occluded node.
    handle.update([rear, front]);
    handle.frame(16);

    expect(handle.pick(0.5, 0.5)).toBe('front');

    handle.dispose();
  });

  it('a click that hits nothing returns null rather than a nearest-by-tie node', () => {
    const handle = createScene(document.createElement('canvas'), { entryDolly: false });
    handle.update([{ ...node('solo', null, 0), position: { x: 0, y: 0, z: 0 } }]);
    handle.frame(16);
    // Far corner: no sphere there. The old positional test needed the pointer
    // within 0.06 of a projected centre; a ray that misses the geometry misses.
    expect(handle.pick(0.02, 0.02)).toBe(null);
    handle.dispose();
  });
});

describe('D4 roster removal disposes the arc it orphans', () => {
  it('removing a node fires dispose on its arc GEOMETRY (and material), not just at teardown', () => {
    const handle = createScene(document.createElement('canvas'), { entryDolly: false });
    handle.update([node('keep', 0.5, Math.PI), node('gone', 0.5, Math.PI)]);
    handle.frame(16);

    // Grab the doomed node's arc geometry and listen for three's dispose event.
    const scene = captured.scene as Scene;
    const root = scene.children[0];
    const arcs = root.children.filter((c): c is Line => c instanceof Line);
    expect(arcs.length).toBe(2);
    const doomed = arcs[1];
    let geometryDisposed = false;
    let materialDisposed = false;
    doomed.geometry.addEventListener('dispose', () => { geometryDisposed = true; });
    // makeArc always builds a single material; narrow the Material | Material[]
    // union for the listener.
    (doomed.material as LineBasicMaterial).addEventListener('dispose', () => { materialDisposed = true; });

    handle.update([node('keep', 0.5, Math.PI)]); // roster shrinks
    handle.frame(16);

    // Pre-fix: the removal loop disposed only the MESH material — the arc's
    // per-node BufferGeometry and LineBasicMaterial leaked until teardown.
    expect(geometryDisposed).toBe(true);
    expect(materialDisposed).toBe(true);

    handle.dispose();
  });
});

describe('Q5 the camera and the fit share ONE fov constant', () => {
  it('the PerspectiveCamera constructor reads VFOV_DEG — not a second literal', async () => {
    // Structural by design: Q5's defect was two literals that agreed BY
    // COINCIDENCE, which no behavioural assertion can distinguish from true
    // sharing until someone edits one of them. So the coupling itself is what
    // gets pinned — assert the constructor DEPENDS on the exported constant
    // (§"assert the coupling, not just the behaviour"). Reverting the camera to
    // `55` fails this even though every number still lines up today.
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    // cwd-relative: vitest rewrites import.meta.url under jsdom to a non-file
    // URL, so fileURLToPath is unavailable here.
    const src = readFileSync(resolve(process.cwd(), 'src/components/constellation-three.ts'), 'utf-8');
    expect(src).toMatch(/new PerspectiveCamera\(VFOV_DEG/);
    expect(src).not.toMatch(/new PerspectiveCamera\(\s*55/);
  });
});
