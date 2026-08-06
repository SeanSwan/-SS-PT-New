/**
 * swanGlobeScene — the imperative Three.js layer for SwanGlobe (SWA-138 S12).
 *
 * Strict-M1 discipline (HY3 B1): the scene does NOT auto-rotate and has NO
 * ambient loop. It renders on demand — on drag, on hover, on data change —
 * and parks itself otherwise. Perf contract (HY3 B3): pixel-ratio clamp,
 * IntersectionObserver + visibilitychange pause, InstancedMesh markers,
 * full dispose() on teardown, and a webglcontextlost escape hatch.
 */

import * as THREE from 'three';

export interface GlobeCity {
  city: string;
  country: string;
  lat: number;
  lon: number;
  count: number;
}

export interface SceneHandle {
  setCities: (cities: GlobeCity[]) => void;
  focusCity: (index: number | null) => void;
  dispose: () => void;
}

export interface SceneOptions {
  container: HTMLElement;
  onHover: (index: number | null) => void;
  onContextLost: () => void;
}

const GLOBE_RADIUS = 1;
const MAX_DPR = 2;
// SWA-138 FIX: the sphere was 0x0a0a0f — the SAME value as the dashboard
// background — so the globe read as a void with only its halo visible. The
// ocean now uses a deep Swan blue that separates from the card behind it.
const OCEAN = 0x32496f;
const ICE_WING = 0x60c0f0;
const GILDED_FERN = 0xc6a84b;

/** lat/lon (degrees) → point on the sphere surface. */
export function latLonToVector3(lat: number, lon: number, radius = GLOBE_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/** Visitor count → marker scale, mirroring the SVG map's markerRadius ramp. */
export function markerScale(count: number): number {
  return Math.min(0.055, 0.018 + Math.log10(Math.max(1, count)) * 0.014);
}

export function createGlobeScene({ container, onHover, onContextLost }: SceneOptions): SceneHandle {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.35, 3.1);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const world = new THREE.Group();
  scene.add(world);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS, 64, 48),
    new THREE.MeshStandardMaterial({ color: OCEAN, roughness: 0.85, metalness: 0.12 }),
  );
  world.add(sphere);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS * 1.015, 48, 32),
    new THREE.MeshBasicMaterial({ color: ICE_WING, transparent: true, opacity: 0.10, side: THREE.BackSide }),
  );
  world.add(halo);

  const graticule = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(GLOBE_RADIUS * 1.001, 24, 16)),
    new THREE.LineBasicMaterial({ color: ICE_WING, transparent: true, opacity: 0.22 }),
  );
  world.add(graticule);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(ICE_WING, 1.1);
  key.position.set(2.5, 1.8, 2.2);
  scene.add(key);

  // Markers: ONE InstancedMesh for every city (HY3 B3).
  const markerGeometry = new THREE.SphereGeometry(1, 10, 8);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: ICE_WING });
  let markers: THREE.InstancedMesh | null = null;
  let cityCount = 0;
  let focusedIndex: number | null = null;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dummy = new THREE.Object3D();
  const baseColor = new THREE.Color(ICE_WING);
  const focusColor = new THREE.Color(GILDED_FERN);

  let disposed = false;
  let frameRequested = false;
  let paused = false;

  const render = () => {
    frameRequested = false;
    if (disposed || paused) return;
    renderer.render(scene, camera);
  };

  /** On-demand render — never a persistent RAF loop (M1). */
  const requestRender = () => {
    if (disposed || paused || frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(render);
  };

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    requestRender();
  };

  const setCities = (cities: GlobeCity[]) => {
    if (markers) {
      world.remove(markers);
      markers.dispose();
      markers = null;
    }
    cityCount = cities.length;
    if (cityCount === 0) return requestRender();

    markers = new THREE.InstancedMesh(markerGeometry, markerMaterial, cityCount);
    markers.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cityCount * 3), 3);
    cities.forEach((city, i) => {
      const position = latLonToVector3(city.lat, city.lon, GLOBE_RADIUS * 1.012);
      const scale = markerScale(city.count);
      dummy.position.copy(position);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      markers!.setMatrixAt(i, dummy.matrix);
      markers!.setColorAt(i, baseColor);
    });
    markers.instanceMatrix.needsUpdate = true;
    if (markers.instanceColor) markers.instanceColor.needsUpdate = true;
    world.add(markers);
    requestRender();
  };

  const focusCity = (index: number | null) => {
    focusedIndex = index;
    if (!markers) return;
    for (let i = 0; i < cityCount; i += 1) {
      markers.setColorAt(i, i === index ? focusColor : baseColor);
    }
    if (markers.instanceColor) markers.instanceColor.needsUpdate = true;
    requestRender();
  };

  // Drag-to-rotate: camera/world orientation only, no inertia loop.
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const onPointerDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    renderer.domElement.setPointerCapture?.(e.pointerId);
  };
  const onPointerUp = (e: PointerEvent) => {
    dragging = false;
    renderer.domElement.releasePointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (dragging) {
      world.rotation.y += (e.clientX - lastX) * 0.005;
      world.rotation.x = THREE.MathUtils.clamp(
        world.rotation.x + (e.clientY - lastY) * 0.005, -1.1, 1.1,
      );
      lastX = e.clientX;
      lastY = e.clientY;
      requestRender();
      return;
    }
    if (!markers) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(markers, false)[0];
    const nextIndex = hit?.instanceId ?? null;
    if (nextIndex !== focusedIndex) {
      focusCity(nextIndex);
      onHover(nextIndex);
    }
  };

  const handleContextLost = (e: Event) => {
    e.preventDefault();
    onContextLost();
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

  // Pause when offscreen or backgrounded (HY3 B3).
  const observer = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(([entry]) => {
        paused = !entry.isIntersecting;
        if (!paused) requestRender();
      })
    : null;
  observer?.observe(container);

  const onVisibility = () => {
    paused = document.hidden;
    if (!paused) requestRender();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(resize)
    : null;
  resizeObserver?.observe(container);
  resize();

  return {
    setCities,
    focusCity,
    dispose: () => {
      disposed = true;
      observer?.disconnect();
      resizeObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      markers?.dispose();
      markerGeometry.dispose();
      markerMaterial.dispose();
      sphere.geometry.dispose();
      (sphere.material as THREE.Material).dispose();
      halo.geometry.dispose();
      (halo.material as THREE.Material).dispose();
      graticule.geometry.dispose();
      (graticule.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
