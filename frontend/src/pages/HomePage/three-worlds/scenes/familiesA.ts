/**
 * families — the eight parametric Three.js scene families behind the 20 hero mechanics.
 * @module pages/HomePage/three-worlds/scenes/families
 *
 * WHY FAMILIES AND PARAMETERS, NOT 20 ONE-OFF SCENES
 * Twenty bespoke scene files would blow the rule-4 line cap and be unreviewable.
 * Instead there are eight real scene families (points, tunnel, orbit, lines,
 * waveform, instances, terrain, refract) and `looks.ts` maps each hero mechanic
 * onto a family plus its own numeric axis. The divergence that matters is
 * structural and lives in `skeletons.ts`; this file supplies the material.
 *
 * Every builder returns `{ update, dispose }`. `dispose` is not optional in
 * spirit: geometries, materials and attribute buffers are all released, or twenty
 * variants in one gallery would leak GPU memory until the tab dies.
 *
 * BOUNDS: no network, no storage, no DOM. Pure Three.js against the WorldContext.
 */
import * as THREE from 'three';
import type { WorldContext, WorldHandle } from '../runtime';
import type { SceneParams } from './paramsCore';

/** Shared setup: a scene gets fog when it has depth so far geometry fades out. */
function withFog(ctx: WorldContext, color: THREE.Color, near: number, far: number): void {
  ctx.scene.fog = new THREE.Fog(color, near, far);
}

/** Points family — used by swarm/field/ignition mechanics. */


export function pointsFamily(ctx: WorldContext, p: SceneParams): WorldHandle {
  const count = p.count;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * p.spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * p.spread * 0.6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * p.spread;
    seeds[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const mat = new THREE.PointsMaterial({
    color: p.accent, size: p.size, transparent: true, opacity: 0.9,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  ctx.scene.add(points);
  withFog(ctx, p.base, 8, 60);

  const base = positions.slice();
  return {
    update: (dt, elapsed) => {
      const arr = geo.getAttribute('position') as THREE.BufferAttribute;
      const a = arr.array as Float32Array;
      const drift = Math.sin(elapsed * p.speed) * p.drift;
      for (let i = 0; i < count; i += 1) {
        const s = seeds[i];
        a[i * 3 + 1] = base[i * 3 + 1] + Math.sin(elapsed * p.speed + s * 6.28) * drift;
        a[i * 3] = base[i * 3] + Math.cos(elapsed * p.speed * 0.5 + s * 3.14) * drift * 0.5;
      }
      arr.needsUpdate = true;
      points.rotation.y += dt * p.spin;
      ctx.camera.position.z = p.cameraZ - ctx.scrollProgress * p.dolly;
    },
    dispose: () => { geo.dispose(); mat.dispose(); ctx.scene.remove(points); },
  };
}

/** Ring/tunnel family — concentric geometry the camera travels through. */
export function ringsFamily(ctx: WorldContext, p: SceneParams): WorldHandle {
  const group = new THREE.Group();
  const geo = new THREE.TorusGeometry(p.radius, p.thickness, 8, 48);
  const mat = new THREE.MeshBasicMaterial({
    color: p.accent, transparent: true, opacity: 0.7, wireframe: p.wire,
  });
  const rings: THREE.Mesh[] = [];
  const total = p.count;
  for (let i = 0; i < total; i += 1) {
    const ring = new THREE.Mesh(geo, mat);
    ring.position.z = -i * p.gap;
    ring.rotation.z = i * 0.15;
    group.add(ring);
    rings.push(ring);
  }
  ctx.scene.add(group);
  withFog(ctx, p.base, 6, 55);

  return {
    update: (dt, elapsed) => {
      for (let i = 0; i < rings.length; i += 1) {
        const r = rings[i];
        r.position.z += dt * p.speed * 4;
        if (r.position.z > 6) r.position.z -= total * p.gap;
        r.rotation.z += dt * p.spin;
        const s = 1 + Math.sin(elapsed * 0.6 + i * 0.4) * 0.06;
        r.scale.setScalar(s);
      }
      ctx.camera.position.z = p.cameraZ - ctx.scrollProgress * p.dolly;
      ctx.camera.rotation.z = ctx.pointer.x * 0.05;
    },
    dispose: () => { geo.dispose(); mat.dispose(); ctx.scene.remove(group); },
  };
}

/**
 * Orbit family — a solid core with orbiting satellites.
 *
 * Deliberately UNLIT: `MeshBasicMaterial` plus fog, not a lit PBR material. Lit
 * materials compile a uniform block of light structs, and that block is what threw
 * `Cannot read properties of null (reading 'trim')` inside Three's
 * `WebGLProgram.getUniforms` on the software renderer used for QA. Unlit scenes
 * render identically everywhere, cost less, and cannot fail that way — and the
 * fleet's visual language is additive/wireframe, so nothing is lost.
 */
export function orbitFamily(ctx: WorldContext, p: SceneParams): WorldHandle {
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(p.radius, p.detail),
    new THREE.MeshBasicMaterial({ color: p.accent, wireframe: p.wire }),
  );
  ctx.scene.add(core);

  const satGeo = new THREE.SphereGeometry(p.size, 12, 12);
  const satMat = new THREE.MeshBasicMaterial({ color: ctx.colors.iceWing });
  const sats: THREE.Mesh[] = [];
  for (let i = 0; i < p.count; i += 1) {
    const s = new THREE.Mesh(satGeo, satMat);
    ctx.scene.add(s);
    sats.push(s);
  }

  return {
    update: (dt, elapsed) => {
      core.rotation.y += dt * p.spin;
      core.rotation.x = Math.sin(elapsed * 0.3) * 0.2;
      const reach = p.radius * 2.6;
      for (let i = 0; i < sats.length; i += 1) {
        const a = elapsed * p.speed + (i / Math.max(1, p.count)) * Math.PI * 2;
        sats[i].position.set(Math.cos(a) * reach, Math.sin(a * 1.3) * reach * 0.4, Math.sin(a) * reach);
      }
      ctx.camera.position.z = p.cameraZ - ctx.scrollProgress * p.dolly;
      ctx.camera.position.x = ctx.pointer.x * 1.6;
    },
    dispose: () => {
      core.geometry.dispose(); (core.material as THREE.Material).dispose();
      satGeo.dispose(); satMat.dispose();
      ctx.scene.clear();
    },
  };
}

/** Line family — drawn strokes that assemble as scroll advances. */
export function linesFamily(ctx: WorldContext, p: SceneParams): WorldHandle {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mat = new THREE.LineBasicMaterial({ color: p.accent, transparent: true, opacity: 0.85 });
  for (let i = 0; i < p.count; i += 1) {
    const pts: THREE.Vector3[] = [];
    const y = (i - p.count / 2) * (p.spread / p.count);
    for (let x = -20; x <= 20; x += 0.5) {
      pts.push(new THREE.Vector3(x, y + Math.sin(x * 0.4 + i) * p.drift, -Math.abs(x) * 0.3));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    geos.push(g);
    group.add(new THREE.Line(g, mat));
  }
  ctx.scene.add(group);
  withFog(ctx, p.base, 8, 60);

  return {
    update: (dt, elapsed) => {
      group.rotation.y = Math.sin(elapsed * 0.2) * 0.3 + ctx.pointer.x * 0.2;
      group.position.z = -ctx.scrollProgress * p.dolly;
      group.children.forEach((c, i) => { c.position.y = Math.sin(elapsed * p.speed + i * 0.5) * p.drift; });
      void dt;
    },
    dispose: () => { geos.forEach((g) => g.dispose()); mat.dispose(); ctx.scene.remove(group); },
  };
}
