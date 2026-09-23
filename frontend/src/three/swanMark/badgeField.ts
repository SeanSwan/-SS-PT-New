/**
 * badgeField.ts — regenerates the badge gradient at runtime.
 *
 * This is the whole reason the badge needs no image asset: the reference's navy
 * field (a degree-4 polynomial fit) plus the swan's soft drop shadow (a 9x9
 * Gaussian RBF fit) are stored as coefficients in the spec and evaluated here
 * into a DataTexture.
 *
 * Split out of swanMarkFactory.ts to keep each module under Rule 4's 300-line cap.
 */
import * as THREE from 'three';
import type { SwanMarkSpec } from './swanMarkSpec';

/**
 * sRGB hex -> the renderer's working (linear) space.
 *
 * BufferAttribute vertex colours are NOT colour-managed by three: whatever
 * numbers go in are treated as already-linear. Writing raw sRGB bytes there
 * renders the whole swan visibly washed out, so the conversion has to happen
 * here, once, with ColorManagement enabled.
 */
export function hexToLinearRgb(hex: string): [number, number, number] {
  const c = new THREE.Color().setStyle(hex, THREE.SRGBColorSpace);
  return [c.r, c.g, c.b];
}

/**
 * One sRGB component (0..1) -> the renderer's linear working space.
 *
 * The per-vertex gradient path cannot afford a `THREE.Color` per vertex (there are
 * 18,885 of them), so the transfer is inlined. The literals below are copied from
 * three's own `SRGBToLinear` so the two are bit-identical rather than merely close;
 * `srgbToLinear` is asserted against `hexToLinearRgb` in the contract tests, so the
 * pair cannot silently drift apart.
 */
export function srgbToLinear(c: number): number {
  return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
}

/**
 * Regenerate the badge field into a DataTexture.
 *
 * Row order matters: WebGL samples data row 0 at t=0, and CircleGeometry puts
 * uv.v=1 at the TOP of the disc. So spec row j (y down, j=0 is the top) must be
 * written to data row (size-1-j) or the badge renders upside down. three's
 * `flipY` is not honoured for DataTexture uploads, so the flip is done here.
 */
export function createBadgeFieldTexture(spec: SwanMarkSpec, size: number): THREE.DataTexture {
  const f = spec.badge.field;
  const terms = f.polyTerms;
  const centres = f.rbfCentres;
  const inv2s2 = 1 / (2 * f.rbfSigma * f.rbfSigma);
  const data = new Uint8Array(size * size * 4);

  for (let j = 0; j < size; j++) {
    const v = (j / (size - 1)) * 2 - 1;
    const row = size - 1 - j;
    for (let i = 0; i < size; i++) {
      const u = (i / (size - 1)) * 2 - 1;
      const o = (row * size + i) * 4;
      for (let c = 0; c < 3; c++) {
        let value = 0;
        const pc = f.polyCoef[c];
        for (let k = 0; k < terms.length; k++) {
          value += pc[k] * Math.pow(u, terms[k][0]) * Math.pow(v, terms[k][1]);
        }
        const rc = f.rbfCoef[c];
        for (let k = 0; k < centres.length; k++) {
          const du = u - centres[k][0];
          const dv = v - centres[k][1];
          value += rc[k] * Math.exp(-(du * du + dv * dv) * inv2s2);
        }
        data[o + c] = Math.max(0, Math.min(255, Math.round(value)));
      }
      data[o + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Spec space is 0..1 with y DOWN. Three.js wants y UP and centred on the badge. */
export function toLocal(x: number, y: number): [number, number] {
  return [x - 0.5, 0.5 - y];
}
