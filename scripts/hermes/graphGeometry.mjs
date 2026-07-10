/**
 * graphGeometry.mjs — Slice 0 de-risk of the v2 plan's A1 BLOCKER (label <-> camera
 * sync). The v1 draft said "labels share the camera transform" without a formula;
 * the technical red-team proved percentage-positioned HTML labels canNOT track an
 * SVG `<g>` transform. This module is the PROVEN sync primitive Slice 1/2 build on.
 *
 * THE CONTRACT (aspect-locked graph pane `aspect-ratio: 1280/640`, so a single
 * uniform px-per-user-unit applies to both axes):
 *   - The SVG content lives in a `<g class="camera">` transformed in USER units:
 *       transform = translate(tx, ty) scale(s)
 *   - The HTML `.label-layer` is a sibling container transformed in PX (converted):
 *       transform = translate(tx*ppu, ty*ppu) scale(s)     where ppu = renderedW/1280
 *   - Each label is positioned ONCE inside the container at its node's px anchor
 *       (x*ppu, y*ppu) and NEVER moved per-frame (only the container transform moves).
 *
 * Because ppu is uniform (aspect locked), a node at SVG (x,y) lands at the SAME
 * screen pixel whether projected through the SVG path or the label path — proven
 * by graphGeometry.test.mjs across a matrix of pan/zoom. Pure math, no DOM.
 */
export const VB_W = 1280;
// 700 (not 640): radial labels need vertical room at the top/bottom clusters or
// they clip the pane. Any VB works — the parity proof only requires the pane be
// LOCKED to VB_W/VB_H so px-per-unit stays uniform on both axes.
export const VB_H = 700;
export const VB_ASPECT = VB_W / VB_H;

/** Uniform px per SVG user-unit for an aspect-locked pane of the given rendered width. */
export function pxPerUnit(renderedWidth) {
  return renderedWidth / VB_W;
}

/** A node's fixed anchor (px) inside the label-layer container, set ONCE at render. */
export function labelAnchorPx(x, y, renderedWidth) {
  const ppu = pxPerUnit(renderedWidth);
  return { left: x * ppu, top: y * ppu };
}

/** The camera transform for the SVG `<g>` (user units). */
export function svgCameraTransform(tx, ty, s) {
  return `translate(${tx} ${ty}) scale(${s})`;
}

/** The camera transform for the HTML label-layer container (px-converted). */
export function labelCameraTransform(tx, ty, s, renderedWidth) {
  const ppu = pxPerUnit(renderedWidth);
  return `translate(${tx * ppu}px, ${ty * ppu}px) scale(${s})`;
}

/** Screen px of node (x,y) via the SVG path: user-space transform, then px mapping. */
export function svgScreenPos(x, y, tx, ty, s, renderedWidth) {
  const ppu = pxPerUnit(renderedWidth);
  return { x: (x * s + tx) * ppu, y: (y * s + ty) * ppu };
}

/** Screen px of the same node via the LABEL path: anchor(px) inside a px-transformed container. */
export function labelScreenPos(x, y, tx, ty, s, renderedWidth) {
  const ppu = pxPerUnit(renderedWidth);
  const anchor = labelAnchorPx(x, y, renderedWidth); // {left:x*ppu, top:y*ppu}
  // container transform translate(tx*ppu, ty*ppu) scale(s) applied to the anchor:
  return { x: anchor.left * s + tx * ppu, y: anchor.top * s + ty * ppu };
}

/** Zoom-to-cursor: new translate so the world point under the cursor stays put. */
export function zoomToCursor(prev, cursorX, cursorY, factor, renderedWidth) {
  const ppu = pxPerUnit(renderedWidth);
  const s2 = prev.s * factor;
  // world (user) coord currently under the cursor, from the SVG projection inverse:
  const wx = (cursorX / ppu - prev.tx) / prev.s;
  const wy = (cursorY / ppu - prev.ty) / prev.s;
  // solve new tx,ty so svgScreenPos(wx,wy,tx2,ty2,s2) == (cursorX,cursorY):
  return { tx: cursorX / ppu - wx * s2, ty: cursorY / ppu - wy * s2, s: s2 };
}
