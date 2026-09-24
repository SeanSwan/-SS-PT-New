/*
 * constellation-three.ts — the WebGL scene. THIS IS THE LAZY CHUNK.
 *
 * Every `three` import in the console lives here and nowhere else, and this
 * module is reached only through `loadConstellationChunk()` (a dynamic
 * `import()`), which is gated on idle-after-first-status-poll AND on
 * not-reduced-motion AND on WebGL being present. That is what makes T-E3's
 * "reduced-motion OR WebGL-absent → the chunk is never fetched at all" true: an
 * unreached dynamic import is a chunk the browser never requests.
 *
 * ── WHY THE SCENE BUILDS FROM `BrainNode[]` AND NOT FROM `CreatorRow[]` ─────
 *
 * The layout maths is pure and tested (`constellation-layout.ts`, T-T1). If this
 * module recomputed positions it would be a second, untested implementation of
 * the same rule — and the two would drift silently, which is the defect class
 * this project keeps finding. So this module CONSUMES nodes and owns only
 * rendering.
 *
 * ── DPR IS CLAMPED AT 2, PER T-E3 ───────────────────────────────────────────
 *
 * `Math.min(window.devicePixelRatio, 2)`. An unclamped 3x display quadruples the
 * fragment work for a scene nobody inspects that closely, and the budget in
 * `06 §T-E3` was measured at ≤2.
 *
 * ── THE ENTRY DOLLY IS THE ONLY NARRATIVE MOTION ────────────────────────────
 *
 * `02 §84`: "the entry dolly is the ONLY narrative motion on the page"
 * (`motion.md` one-signature-moment rule), and it is SKIPPED under reduced
 * motion. It is also skipped if the chunk arrives after the idle window
 * (`14 §3` item 4) rather than janking in late — the caller decides that and
 * passes `entryDolly`.
 */

import {
  BufferGeometry,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PointsMaterial,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  WebGLRenderer,
} from 'three';
import { STATE_COLOR, nodeRadius, type BrainNode } from './constellation-layout';
import {
  ARC_OVERSIZE, RING_OVERSIZE, VFOV_DEG,
  buildArcGeometry, createGeometryCache, distanceToFit, makeArc, makeDust, makeDiagnostics,
} from './constellation-scene-parts';

export interface SceneHandle {
  /** Rebuild node meshes from a new layout — called when the roster changes. */
  update: (nodes: BrainNode[]) => void;
  /** Advance one frame. `elapsedMs` is the frame delta from the loop. */
  frame: (elapsedMs: number) => void;
  /** Which node is under a normalised (0..1, 0..1) pointer position, or null. */
  pick: (nx: number, ny: number) => string | null;
  /** Move the keyboard focus ring to a node by channelId. */
  focusNode: (channelId: string | null) => void;
  resize: (w: number, h: number) => void;
  /** Live renderer/camera numbers — the bench's real-scene observations (U3). */ diagnostics: () => ReturnType<typeof makeDiagnostics> extends () => infer R ? R : never;
  dispose: () => void;
}

const BG = '#0A0A0F';

/**
 * Build the scene in `canvas` and return a handle.
 *
 * Throws only if `WebGLRenderer` cannot construct — the caller treats that as
 * "no WebGL" and renders the fallback list, which is why the caller checks
 * capability first (`hasWebGL`) and does not rely on this throwing.
 */
export function createScene(canvas: HTMLCanvasElement, opts: { entryDolly?: boolean } = {}): SceneHandle {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setClearColor(new Color(BG));
  // T-E3: DPR clamp ≤ 2.
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  renderer.setPixelRatio(dpr);

  const scene = new Scene();
  // Q5 (Astra 140126): the FOV is ONE constant, shared with distanceToFit —
  // the fit and the camera used to agree only because two literals coincided.
  const camera = new PerspectiveCamera(VFOV_DEG, 1, 1, 1000);

  /** Node meshes, keyed by channelId so an update can reconcile rather than rebuild. */
  const meshes = new Map<string, { mesh: Mesh; node: BrainNode; arc: Line }>();
  const root = new Group();
  scene.add(root);

  // The star field is decorative and static: it is part of the "Vault Observatory"
  // frame, not a signal, so it never moves and carries no data.
  const dust = makeDust();
  scene.add(dust);

  // Focus ring — a keyboard affordance, not a hover effect (`03 §a11y`: "Node
  // focus shows the same tooltip as hover; every action also exists as a DOM
  // control").
  const ring = new Mesh(
    new SphereGeometry(1, 16, 12),
    new MeshBasicMaterial({ color: '#8B5CF6', wireframe: true, transparent: true, opacity: 0.9 }),
  );
  ring.visible = false;
  scene.add(ring);

  let w = 1;
  let h = 1;

  const sphereFor = createGeometryCache();

  // ── FRAMING: the camera distance is DERIVED, never hardcoded ───────────────
  //
  // The solver, the FOV and the margin live in `constellation-scene-parts.ts`
  // with the rest of the "what the scene is made of" pieces. What stays here is
  // the state: the measured radius and the distance it implies.
  //
  // A fixed `z` cropped the constellation in the first S5 render — nodes clipped
  // at the bottom and left of a 1040x560 panel, because the near pole sits much
  // closer to the camera than the far pole. The near pole problem is solved by
  // measuring from the real node positions in `update()`, so the fit follows the
  // data — and D5 (Astra 140126) extended what is measured to include the
  // arc/ring reach, because a bound of sphere-only clipped a 1.6r arc against a
  // 1.18 margin every time.
  let sceneRadius = 1;
  // The dolly starts slightly further out and pushes IN to the fitted distance,
  // so the destination is the fitted framing rather than a second constant.
  let settleZ = 0;

  const update = (nodes: BrainNode[]) => {
    const seen = new Set<string>();
    // Measure the true extent as we walk, so the camera fit follows the data.
    // D5: the extent of a node is what is DRAWN, not just its sphere — the arc
    // reaches ARC_OVERSIZE when visible, and the focus ring always can reach
    // RING_OVERSIZE, both beyond FIT_MARGIN's sphere-only cover.
    let measured = 0;
    for (const n of nodes) {
      seen.add(n.channelId);
      const r = nodeRadius(n.size);
      const color = STATE_COLOR[n.state];
      const existing = meshes.get(n.channelId);
      const { x, y, z } = n.position;
      const drawable = (n.coverage !== null && n.coverage > 0 ? ARC_OVERSIZE : RING_OVERSIZE) * r;
      measured = Math.max(measured, Math.hypot(x, y, z) + drawable);

      if (existing) {
        existing.mesh.position.set(n.position.x, n.position.y, n.position.z);
        existing.mesh.geometry = sphereFor(r);
        (existing.mesh.material as MeshBasicMaterial).color.set(color);
        existing.node = n;
        // D2 (2026-09-22): rewrite the arc's VERTICES too — moving/flipping only
        // froze the creation sweep (a half-ring on a grown ring). Dispose and
        // rebuild the buffer; the parented Line node and its position survive.
        (existing.arc.geometry as BufferGeometry).dispose();
        existing.arc.geometry = buildArcGeometry(n);
        existing.arc.position.copy(existing.mesh.position);
        existing.arc.visible = n.coverage !== null && n.coverage > 0;
      } else {
        const mesh = new Mesh(
          sphereFor(r),
          new MeshBasicMaterial({ color }),
        );
        mesh.position.set(n.position.x, n.position.y, n.position.z);
        const arc = makeArc(n);
        arc.position.copy(mesh.position);
        root.add(mesh);
        root.add(arc);
        meshes.set(n.channelId, { mesh, node: n, arc });
      }
    }
    // Reconcile removals — a creator deleted in the engine must not keep orbiting.
    for (const [id, entry] of meshes) {
      if (seen.has(id)) continue;
      root.remove(entry.mesh);
      root.remove(entry.arc);
      (entry.mesh.material as MeshBasicMaterial).dispose();
      // D4 (Astra 140126): the arc's geometry and material are PER-NODE
      // allocations (unlike the cached sphere geometry, which the cache owns) —
      // without these two lines every roster removal leaked them for the
      // scene's whole lifetime; teardown-only disposal is too late.
      (entry.arc.geometry as BufferGeometry).dispose();
      (entry.arc.material as LineBasicMaterial).dispose();
      meshes.delete(id);
    }

    // Commit the measured extent and re-solve the camera distance. Doing this
    // here (rather than in `createScene`) is what makes the fit follow the
    // roster: a 3-creator store and a 300-creator store both fill the panel,
    // and neither inherits a distance tuned for the other.
    //
    // An EMPTY roster keeps the previous radius: collapsing to 0 would slam the
    // camera into the origin and fill the frame with the star field.
    if (nodes.length > 0) {
      sceneRadius = measured;
      settleZ = distanceToFit(sceneRadius, camera.aspect);
    }
  };

  // ── THE ENTRY DOLLY: the only narrative motion, and it is budgeted ─────────
  const dollyEnabled = opts.entryDolly !== false;
  let dollyT = dollyEnabled ? 0 : 1;
  const DOLLY_MS = 1100;

  const resize = (nw: number, nh: number) => {
    w = Math.max(1, nw);
    h = Math.max(1, nh);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Re-fit on every resize: a narrow panel is exactly when the crop appeared.
    settleZ = distanceToFit(sceneRadius, camera.aspect);
  };

  let focused: string | null = null;

  const frame = (elapsedMs: number) => {
    if (settleZ === 0) settleZ = distanceToFit(sceneRadius, camera.aspect);
    // Dolly: camera pushes in once, then stops. Skipped entirely when disabled.
    if (dollyT < 1) {
      dollyT = Math.min(1, dollyT + elapsedMs / DOLLY_MS);
      // Ease-out cubic — settles rather than stopping dead.
      const e = 1 - (1 - dollyT) ** 3;
      // From 30% further out, in to the fitted distance.
      const z = settleZ * (1.3 - 0.3 * e);
      camera.position.set(0, 0, z);
    } else {
      camera.position.set(0, 0, settleZ);
    }
    camera.lookAt(0, 0, 0);

    if (focused && meshes.has(focused)) {
      const m = meshes.get(focused)!;
      ring.position.copy(m.mesh.position);
      const s = nodeRadius(m.node.size) * RING_OVERSIZE;
      ring.scale.set(s, s, s);
      ring.visible = true;
    } else {
      ring.visible = false;
    }

    renderer.render(scene, camera);
  };

  /**
   * Picking by RAYCAST: the nearest sphere the click ray actually hits.
   *
   * This REVERSES the original design (nearest projected centre within 0.06,
   * ties by insertion order) — Astra 140126 D6 showed that ignored radius and
   * depth, so a fully occluded rear node could win a click, and the analytic
   * shortcut's independence-from-camera-matrices argument was answering a
   * different question than the one a click asks. The camera's world matrix is
   * refreshed here (not assumed from the last render) so a pick between an
   * update and its first frame still rays against where things ARE.
   */
  const raycaster = new Raycaster();
  const pick = (nx: number, ny: number): string | null => {
    camera.updateMatrixWorld();
    root.updateMatrixWorld(true);
    raycaster.setFromCamera(new Vector2(nx * 2 - 1, -(ny * 2 - 1)), camera);
    const targets = [...meshes.values()].map((e) => e.mesh);
    const hits = raycaster.intersectObjects(targets, false);
    if (!hits.length) return null;
    const hit = hits[0].object;
    for (const [id, entry] of meshes) {
      if (entry.mesh === hit) return id;
    }
    return null;
  };

  const focusNode = (id: string | null) => { focused = id; };

  const dispose = () => {
    for (const [, entry] of meshes) {
      root.remove(entry.mesh);
      root.remove(entry.arc);
      (entry.mesh.material as MeshBasicMaterial).dispose();
      (entry.arc.geometry as BufferGeometry).dispose();
      (entry.arc.material as LineBasicMaterial).dispose();
    }
    meshes.clear();
    sphereFor.dispose();
    (ring.material as MeshBasicMaterial).dispose();
    ring.geometry.dispose();
    dust.geometry.dispose();
    (dust.material as PointsMaterial).dispose();
    // THE CONTEXT IS RELEASED, NOT JUST DROPPED. T-T2 asserts "remount → clean
    // teardown (no leaked context)"; a browser allows ~16 live WebGL contexts and
    // a dev-mode remount loop would exhaust them without this line.
    renderer.dispose();
    renderer.forceContextLoss();
  };

  const diagnostics = makeDiagnostics(renderer, camera);

  return { update, frame, pick, focusNode, resize, diagnostics, dispose };
}
