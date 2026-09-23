/**
 * swanMarkSpec.ts — the shape of `swan-mark.mesh.json`.
 *
 * Split out of swanMarkFactory.ts to keep each module under Rule 4's 300-line cap.
 * The factory re-exports these types, so `import { SwanMarkSpec } from
 * './swanMarkFactory'` keeps working.
 *
 * Two specs exist and they are NOT interchangeable:
 *   evidence/swan-mark.mesh.json   CANONICAL. Includes the rasteriser-only mesh
 *                                  fields; consumed by gate_spec.py.
 *   frontend/.../swan-mark.mesh.json  BROWSER PAYLOAD. Byte-identical subset,
 *                                  minus the fields nothing here reads.
 * `evidence/verify_spec_parity.py` asserts both facts.
 */
import type * as THREE from 'three';

export interface SwanMarkSpec {
  name: string;
  version: number;
  sourceSize: [number, number];
  badge: {
    shape: 'circle';
    centre: [number, number];
    radius: number;
    field: {
      polyTerms: [number, number][];
      polyCoef: number[][];
      rbfGrid: number;
      rbfSigma: number;
      rbfCentres: [number, number][];
      rbfCoef: number[][];
    };
  };
  swan: {
    bboxNorm: [number, number, number, number];
    areaPx: number;
    outline: [number, number][];
  };
  mesh: {
    vertices: [number, number][];
    triangles: [number, number, number][];
    triangleFacet: number[];
  };
  /**
   * Exactly the two fields the payload carries.
   *
   * `color` is the facet's median, kept as the fallback. `plane` is the fitted
   * per-facet shading plane, laid out per channel:
   *
   *     [r0, rx, ry,  g0, gx, gy,  b0, bx, by]
   *
   * evaluated in the spec's own normalised space (x right, y DOWN):
   *     c = c0 + cx * x + cy * y
   *
   * Values are sRGB 0..255. An earlier revision declared `index` / `areaPx` /
   * `colorSpread` here after they had been pruned from the payload, which promised
   * runtime-undefined fields the compiler could not catch - do not re-add them.
   */
  facets: { color: string; plane: number[] }[];
  /** Marks the file as the browser payload rather than the canonical spec. */
  emittedFor?: string;
}

export interface SwanMarkOptions {
  /** Extrusion depth of the badge disc, as a fraction of the badge diameter. */
  badgeDepth?: number;
  /** How far the swan stands proud of the badge face, same units. */
  relief?: number;
  /** Bevel width on the badge's front rim. 0 disables it. */
  badgeBevel?: number;
  /** Yaw / pitch in radians, for a non-frontal view. */
  yaw?: number;
  pitch?: number;
  /** Texture resolution for the generated badge field. */
  badgeTextureSize?: number;
  /** Colour of the extruded side walls. */
  rimColor?: THREE.ColorRepresentation;
  /** Colour of the badge's outer band. */
  bandColor?: THREE.ColorRepresentation;
}

export interface SwanMarkObject {
  group: THREE.Group;
  /** Frame the object for a renderer of this pixel size. */
  resize(width: number, height: number): void;
  setView(yaw: number, pitch: number): void;
  dispose(): void;
  /** Exposed for tests. */
  readonly parts: {
    badge: THREE.Mesh;
    plate: THREE.Mesh;
    rim: THREE.Mesh;
    band: THREE.Mesh;
  };
}
