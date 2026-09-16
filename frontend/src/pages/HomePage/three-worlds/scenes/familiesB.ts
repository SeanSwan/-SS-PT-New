/**
 * families — the eight parametric Three.js scene families behind the 20 hero mechanics.
 * @module pages/HomePage/three-worlds/scenes/families
 *
 * WHY FAMILIES AND PARAMETERS, NOT 20 ONE-OFF SCENES
 * Twenty bespoke scene files would blow the rule-4 line cap and be unreviewable.
 * Instead there are eight real scene families (points, tunnel, orbit, lines,
 * waveform, instances, terrain, shells) and `looks.ts` maps each hero mechanic
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



/** Waveform family — bars whose amplitude responds to scroll and pointer. */
export function waveformFamily(ctx: WorldContext, p: SceneParams): WorldHandle {
  const geo = new THREE.BoxGeometry(0.35, 1, 0.35);
  const mat = new THREE.MeshBasicMaterial({
    color: p.accent,
  });
  const bars: THREE.Mesh[] = [];
  const total = p.count;
  for (let i = 0; i < total; i += 1) {
    const bar = new THREE.Mesh(geo, mat);
    bar.position.x = (i - total / 2) * 0.55;
    ctx.scene.add(bar);
    bars.push(bar);
  }

  return {
    update: (dt, elapsed) => {
      for (let i = 0; i < bars.length; i += 1) {
        const phase = elapsed * p.speed * 2 + i * 0.35;
        const h = 1 + Math.abs(Math.sin(phase)) * p.spread * (0.4 + ctx.scrollProgress);
        bars[i].scale.y = h;
        bars[i].position.y = h / 2 - 2;
      }
      ctx.camera.position.z = p.cameraZ - ctx.scrollProgress * p.dolly;
      ctx.camera.rotation.y = ctx.pointer.x * 0.08;
      void dt;
    },
    dispose: () => { geo.dispose(); mat.dispose(); ctx.scene.clear(); },
  };
}

/** Instanced family — one draw call for thousands of units. */
export function instancedFamily(ctx: WorldContext, p: SceneParams): WorldHandle {
  const geo = new THREE.TetrahedronGeometry(p.size, 0);
  const mat = new THREE.MeshBasicMaterial({
    color: p.accent,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, p.count);
  const dummy = new THREE.Object3D();
  const seeds: number[] = [];
  for (let i = 0; i < p.count; i += 1) seeds.push(Math.random());
  ctx.scene.add(mesh);
  withFog(ctx, p.base, 10, 65);

  return {
    update: (dt, elapsed) => {
      for (let i = 0; i < p.count; i += 1) {
        const s = seeds[i];
        const ring = s * p.spread;
        const a = elapsed * p.speed * (0.3 + s * 0.5) + s * 6.28;
        dummy.position.set(
          Math.cos(a) * ring,
          Math.sin(elapsed * p.speed + s * 5) * p.drift - ctx.scrollProgress * 2,
          Math.sin(a) * ring,
        );
        dummy.rotation.set(a, a * 0.5, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      ctx.camera.position.z = p.cameraZ - ctx.scrollProgress * p.dolly;
      void dt;
    },
    dispose: () => { geo.dispose(); mat.dispose(); ctx.scene.clear(); },
  };
}

/** Terrain family — a displaced plane flown over by the camera. */
export function terrainFamily(ctx: WorldContext, p: SceneParams): WorldHandle {
  const geo = new THREE.PlaneGeometry(p.spread, p.spread, p.detail, p.detail);
  const mat = new THREE.MeshBasicMaterial({
    color: p.accent, wireframe: p.wire,
  });
  const plane = new THREE.Mesh(geo, mat);
  plane.rotation.x = -Math.PI / 2.4;
  ctx.scene.add(plane);
  withFog(ctx, p.base, 10, 70);

  const attr = geo.getAttribute('position') as THREE.BufferAttribute;
  const original = (attr.array as Float32Array).slice();

  return {
    update: (dt, elapsed) => {
      const arr = attr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        const x = original[i];
        const y = original[i + 1];
        arr[i + 2] = Math.sin(x * 0.3 + elapsed * p.speed) * p.drift
          + Math.cos(y * 0.25 - elapsed * p.speed * 0.7) * p.drift;
      }
      attr.needsUpdate = true;
      geo.computeVertexNormals();
      plane.position.z = ((elapsed * p.speed * 2) % p.spread) - p.spread / 2;
      ctx.camera.position.z = p.cameraZ - ctx.scrollProgress * p.dolly;
      ctx.camera.position.y = 2 + ctx.scrollProgress * 3;
      void dt;
    },
    dispose: () => { geo.dispose(); mat.dispose(); ctx.scene.clear(); },
  };
}

/** Shells family — layered transparent shells producing a depth-overlap effect. */
export function shellsFamily(ctx: WorldContext, p: SceneParams): WorldHandle {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  for (let i = 0; i < p.count; i += 1) {
    const g = new THREE.SphereGeometry(p.radius * (1 + i * 0.22), 24, 24);
    const m = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? p.accent : ctx.colors.wingPurple,
      transparent: true, opacity: 0.14,
      side: THREE.DoubleSide,
    });
    geos.push(g); mats.push(m);
    group.add(new THREE.Mesh(g, m));
  }
  ctx.scene.add(group);

  return {
    update: (dt, elapsed) => {
      group.rotation.y += dt * p.spin * 0.5;
      group.rotation.x = Math.sin(elapsed * 0.4) * 0.2;
      group.children.forEach((c, i) => { c.scale.setScalar(1 + Math.sin(elapsed * p.speed + i) * 0.03); });
      ctx.camera.position.z = p.cameraZ - ctx.scrollProgress * p.dolly;
      ctx.camera.position.x = ctx.pointer.x * 1.2;
    },
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      ctx.scene.clear();
    },
  };
}