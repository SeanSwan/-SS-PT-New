/**
 * Headless harness entry. Bundled by esbuild into harness/bundle.js and loaded by
 * harness/index.html; driven by harness/shoot.mjs through puppeteer.
 *
 * Exposes window.__swan so the shooter can set the view, render one frame and
 * read the canvas back. One renderer, one canvas, resized on demand — the same
 * single-canvas strategy the React component uses.
 */
import * as THREE from 'three';
import { createSwanMark, createFramedCamera } from '../../../../../../frontend/src/three/swanMark/swanMarkFactory';
import spec from '../../../../../../frontend/src/three/swanMark/swan-mark.mesh.json';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: true,
  premultipliedAlpha: false,
});
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const camera = createFramedCamera(1);
const swan = createSwanMark(spec as never, {});
scene.add(swan.group);

interface HarnessState {
  size: number;
  yaw: number;
  pitch: number;
  badgeDepth: number;
  relief: number;
}

let state: HarnessState = { size: 1024, yaw: 0, pitch: 0, badgeDepth: 0.075, relief: 0.055 };

function apply(next: Partial<HarnessState>) {
  state = { ...state, ...next };
  renderer.setSize(state.size, state.size, false);
  canvas.width = state.size;
  canvas.height = state.size;
  camera.left = -0.5;
  camera.right = 0.5;
  camera.top = 0.5;
  camera.bottom = -0.5;
  camera.updateProjectionMatrix();
  swan.setView(state.yaw, state.pitch);
  renderer.render(scene, camera);
  return true;
}

(window as never as Record<string, unknown>).__swan = {
  apply,
  specName: (spec as { name: string }).name,
  specVersion: (spec as { version: number }).version,
  facets: (spec as { facets: unknown[] }).facets.length,
  triangles: (spec as { mesh: { triangles: unknown[] } }).mesh.triangles.length,
};

apply({});
(window as never as Record<string, unknown>).__ready = true;
