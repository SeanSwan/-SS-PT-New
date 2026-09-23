/**
 * Experiment: can we beat the browser's canvas downscale by doing it ourselves?
 *
 * Measured so far:
 *   - rendering at 2x css and letting CSS downscale  -> mean 4.758
 *   - rendering at 4x / 8x / 16x                     -> monotonically WORSE
 *   - image-rendering: high-quality                  -> no effect at all
 *   - Python LANCZOS at 1024 -> N                    -> mean 1.47..2.44 (the floor)
 *
 * So the loss is the browser's canvas compositing filter, not resolution. This
 * page tests the obvious workaround: keep the GL canvas off-DOM at k*N, then blit
 * it into a 2D canvas at N with imageSmoothingQuality='high'. drawImage uses the
 * image resampler (the same path <img> uses), not the compositor's canvas filter.
 *
 * Renders each target size at several k values and exposes them for screenshotting.
 */
import * as THREE from 'three';
import { createSwanMark, createFramedCamera } from '../../../../../../frontend/src/three/swanMark/swanMarkFactory';
import spec from '../../../../../../frontend/src/three/swanMark/swan-mark.mesh.json';

const LADDER = [16, 24, 28, 32, 36, 44, 48, 52, 64, 128];
const FACTORS = [1, 2, 4, 8];

const gl = document.createElement('canvas');
const renderer = new THREE.WebGLRenderer({
  canvas: gl,
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

function renderAt(px: number) {
  gl.width = px;
  gl.height = px;
  renderer.setSize(px, px, false);
  camera.left = -0.5;
  camera.right = 0.5;
  camera.top = 0.5;
  camera.bottom = -0.5;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}

const root = document.getElementById('root')!;

for (const n of LADDER) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:flex-end;gap:10px;padding:6px 10px;background:#0A0A0F';
  for (const k of FACTORS) {
    renderAt(n * k);

    // The blit: GL canvas at n*k -> 2D canvas at n, high-quality resample.
    const out = document.createElement('canvas');
    out.id = `blit-${n}-${k}`;
    out.width = n;
    out.height = n;
    out.style.cssText = `width:${n}px;height:${n}px;display:block`;
    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, n, n);
    ctx.drawImage(gl, 0, 0, n * k, n * k, 0, 0, n, n);

    const cell = document.createElement('div');
    cell.style.cssText = 'text-align:center';
    cell.appendChild(out);
    const lab = document.createElement('div');
    lab.textContent = `${n}x${k}`;
    lab.style.cssText = 'color:#E0ECF4;font:10px system-ui;margin-top:2px';
    cell.appendChild(lab);
    row.appendChild(cell);
  }
  root.appendChild(row);
}

(window as never as Record<string, unknown>).__blit = { ladder: LADDER, factors: FACTORS };
(window as never as Record<string, unknown>).__ready = true;
