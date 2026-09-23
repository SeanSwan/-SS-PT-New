/**
 * swanMarkFactory.ts - builds the SwanStudios header swan as a real 3-D object.
 *
 * The geometry and every colour come from `swan-mark.mesh.json`, which is
 * extracted from `frontend/src/assets/Logo.png` by
 * `docs/ai-workflow/AI-HANDOFF/swan-logo-3d-2026-09-18/evidence/extract_mesh.py`.
 * Nothing is downloaded: no GLTF, no image texture, no base64 blob. The badge
 * gradient is regenerated at runtime from the spec's polynomial + RBF
 * coefficients into a DataTexture (see ./badgeField).
 *
 * Types live in ./swanMarkSpec and are re-exported here, so callers can keep
 * importing everything from this module. The split exists to respect Rule 4's
 * 300-line cap; it is pure code motion.
 *
 * Why the front plate is UNLIT
 * ----------------------------
 * The brief is "pixel-perfect against the logo". Under an orthographic camera
 * at yaw=0, pitch=0 the plate projects 1:1 onto the reference, so fidelity is
 * exact only if the fragment colour is the facet colour - any lighting term
 * would move it. So the plate uses MeshBasicMaterial + per-facet vertex colours
 * with depth testing off and relies on submission order (largest facet first),
 * which is precisely what the Python validator does. The depth that makes it
 * three-dimensional lives in the badge disc, the relief height and the rim,
 * all of which are lit.
 */
import * as THREE from 'three';
import { createBadgeFieldTexture, hexToLinearRgb, srgbToLinear, toLocal } from './badgeField';
import type { SwanMarkObject, SwanMarkOptions, SwanMarkSpec } from './swanMarkSpec';

export type { SwanMarkObject, SwanMarkOptions, SwanMarkSpec } from './swanMarkSpec';
export { createBadgeFieldTexture, hexToLinearRgb, srgbToLinear } from './badgeField';

export function createSwanMark(spec: SwanMarkSpec, opts: SwanMarkOptions = {}): SwanMarkObject {
  const badgeDepth = opts.badgeDepth ?? 0.075;
  const relief = opts.relief ?? 0.055;
  const bevel = opts.badgeBevel ?? 0;
  const texSize = opts.badgeTextureSize ?? 192;
  const rimColor = opts.rimColor ?? '#1b3f86';
  const bandColor = opts.bandColor ?? '#001b4d';

  const R = spec.badge.radius;              // 0.5
  const half = badgeDepth / 2;

  const group = new THREE.Group();
  group.name = 'swanMark';

  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(d: T): T => {
    disposables.push(d);
    return d;
  };

  // ---- badge front / back ------------------------------------------------
  const fieldTex = track(createBadgeFieldTexture(spec, texSize));
  const badgeMat = track(
    new THREE.MeshBasicMaterial({ map: fieldTex, toneMapped: false }),
  );
  const discGeo = track(new THREE.CircleGeometry(R, 160));
  const badge = new THREE.Mesh(discGeo, badgeMat);
  badge.name = 'badgeFace';
  badge.position.z = half;
  group.add(badge);

  const backMat = track(
    new THREE.MeshBasicMaterial({ color: new THREE.Color(bandColor), toneMapped: false }),
  );
  const back = new THREE.Mesh(discGeo, backMat);
  back.name = 'badgeBack';
  back.rotation.y = Math.PI;
  back.position.z = -half;
  group.add(back);

  // ---- badge band (the extruded edge) ------------------------------------
  const bandGeo = track(new THREE.CylinderGeometry(R, R, badgeDepth, 160, 1, true));
  bandGeo.rotateX(Math.PI / 2);
  const bandMat = track(
    new THREE.MeshStandardMaterial({ color: new THREE.Color(bandColor), roughness: 0.55, metalness: 0.15 }),
  );
  const band = new THREE.Mesh(bandGeo, bandMat);
  band.name = 'badgeBand';
  group.add(band);

  // ---- swan front plate ---------------------------------------------------
  // Non-indexed so every vertex of a facet can carry its own colour; a shared
  // vertex would force two facets to share a colour and soften the hard low-poly
  // edges the design depends on.
  //
  // SHADING: each facet carries a fitted linear plane, evaluated here at every
  // vertex. Because a plane is exactly reproduced by linear interpolation across a
  // triangle, the GPU renders the fitted plane precisely - no approximation - while
  // neighbouring facets still meet as a hard step. Flattening each facet to its
  // median cost 14.6% of the residual at boundaries and 36.7% deep inside, so this
  // is not decoration: it is the difference between the model and the reference.
  const tris = spec.mesh.triangles;
  const triFacet = spec.mesh.triangleFacet;
  const verts = spec.mesh.vertices;
  const facets = spec.facets;
  const count = tris.length * 3;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const planes = facets.map((f) => f.plane);
  const flats = facets.map((f) => hexToLinearRgb(f.color));
  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

  for (let t = 0; t < tris.length; t++) {
    const fi = triFacet[t];
    const p = planes[fi];
    const flat = flats[fi] ?? [1, 1, 1];
    const hasPlane = Array.isArray(p) && p.length === 9;
    for (let k = 0; k < 3; k++) {
      const vi = tris[t][k];
      const nx = verts[vi][0];
      const ny = verts[vi][1];
      const [lx, ly] = toLocal(nx, ny);
      const o = (t * 3 + k) * 3;
      positions[o] = lx;
      positions[o + 1] = ly;
      positions[o + 2] = 0;
      if (hasPlane) {
        // Plane is sRGB 0..255 in the spec's own space (x right, y DOWN), which is
        // also the space the vertices are in - no axis juggling needed here.
        colors[o] = srgbToLinear(clamp01((p[0] + p[1] * nx + p[2] * ny) / 255));
        colors[o + 1] = srgbToLinear(clamp01((p[3] + p[4] * nx + p[5] * ny) / 255));
        colors[o + 2] = srgbToLinear(clamp01((p[6] + p[7] * nx + p[8] * ny) / 255));
      } else {
        colors[o] = flat[0];
        colors[o + 1] = flat[1];
        colors[o + 2] = flat[2];
      }
    }
  }

  const plateGeo = track(new THREE.BufferGeometry());
  plateGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  plateGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  plateGeo.computeBoundingSphere();

  const plateMat = track(
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      toneMapped: false,
      // Facets deliberately overlap by ~1px to close seam gaps, so the plate is
      // self-intersecting. Submission order (largest facet first) resolves it
      // exactly the way the Python validator does.
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.name = 'swanPlate';
  plate.position.z = half + relief;
  plate.renderOrder = 2;
  group.add(plate);

  // ---- swan rim (the silhouette extruded) ---------------------------------
  const outline = spec.swan.outline;
  const rimVerts: number[] = [];
  const n = outline.length;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = toLocal(outline[i][0], outline[i][1]);
    const [bx, by] = toLocal(outline[(i + 1) % n][0], outline[(i + 1) % n][1]);
    // two triangles per segment: (a0,b0,a1) (b0,b1,a1)
    const z0 = half;
    const z1 = half + relief;
    rimVerts.push(ax, ay, z0, bx, by, z0, ax, ay, z1);
    rimVerts.push(bx, by, z0, bx, by, z1, ax, ay, z1);
  }
  const rimGeo = track(new THREE.BufferGeometry());
  rimGeo.setAttribute('position', new THREE.Float32BufferAttribute(rimVerts, 3));
  rimGeo.computeVertexNormals();
  const rimMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(rimColor),
      roughness: 0.42,
      metalness: 0.2,
      side: THREE.DoubleSide,
    }),
  );
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.name = 'swanRim';
  rim.renderOrder = 1;
  group.add(rim);

  // ---- bevel: a slightly larger, darker disc under the badge face ---------
  let bevelMesh: THREE.Mesh;
  if (bevel > 0) {
    const bevelGeo = track(new THREE.RingGeometry(R - bevel, R, 160));
    const bevelMat = track(
      new THREE.MeshStandardMaterial({ color: new THREE.Color(bandColor), roughness: 0.5, metalness: 0.25 }),
    );
    bevelMesh = new THREE.Mesh(bevelGeo, bevelMat);
    bevelMesh.name = 'badgeBevel';
    bevelMesh.position.z = half + 0.0001;
    bevelMesh.renderOrder = 1;
    group.add(bevelMesh);
  } else {
    bevelMesh = new THREE.Mesh(track(new THREE.BufferGeometry()), track(new THREE.MeshBasicMaterial()));
  }

  // ---- lighting (affects only band / rim / bevel; the plate is unlit) -----
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-0.55, 0.75, 1.1);
  const fill = new THREE.DirectionalLight(0x60c0f0, 0.5);
  fill.position.set(0.9, -0.35, 0.6);
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  group.add(key, fill, ambient);

  // ---- view ---------------------------------------------------------------
  const pivot = new THREE.Group();
  pivot.name = 'swanMarkPivot';
  pivot.add(group);
  // A pure Z rotation of the whole assembly would move the plate out of the
  // frame, so orbit the object around its own centre instead.
  const orbit = new THREE.Group();
  orbit.name = 'swanMarkOrbit';
  orbit.add(pivot);
  const root = new THREE.Group();
  root.add(orbit);

  let yaw = opts.yaw ?? 0;
  let pitch = opts.pitch ?? 0;
  const applyView = () => {
    orbit.rotation.y = yaw;
    orbit.rotation.x = pitch;
  };
  applyView();

  const resize = (_width: number, _height: number) => {
    /* Orthographic framing is fixed to the badge radius; kept for API symmetry. */
  };

  const dispose = () => {
    for (const d of disposables) d.dispose();
  };

  return {
    // The caller adds `root`, not `group`, so yaw/pitch orbit the object.
    group: root as unknown as THREE.Group,
    resize,
    setView: (y, p) => {
      yaw = y;
      pitch = p;
      applyView();
    },
    dispose,
    parts: { badge, plate, rim, band: band as THREE.Mesh },
  };
}

/**
 * Orthographic camera that frames the badge exactly, so the object occupies the
 * same square the reference PNG does.
 */
export function createFramedCamera(
  aspect = 1,
  near = -4,
  far = 4,
): THREE.OrthographicCamera {
  const half = 0.5;
  const cam = new THREE.OrthographicCamera(
    -half * aspect, half * aspect, half, -half, near, far,
  );
  cam.position.set(0, 0, 2.5);
  cam.lookAt(0, 0, 0);
  return cam;
}
