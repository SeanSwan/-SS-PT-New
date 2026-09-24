/*
 * constellation-pointer.ts — pointer → node, in the canvas's own coordinates.
 *
 * WHY THIS FILE EXISTS. Two reasons, and the second is the important one.
 *
 * 1. It is the Rule 4 seam. `BrainConstellation.tsx` was over the 300-line cap
 *    and the rule forbids meeting the cap by deleting the reasoning. The seam is
 *    "where did the user point" vs "how the component is wired", and this is a
 *    pure coordinate transform with no React and no scene ownership.
 *
 * 2. It fixes a real bug that a smaller refactor would have re-introduced. The
 *    component previously normalised the pointer against the FRAME rect while
 *    the scene's `pick()` compares against coordinates projected through the
 *    CAMERA — i.e. the canvas box. The frame also contains the roster list, so
 *    every pointer position was mapped into a box taller than the one drawn
 *    into. With a ~6% hit radius in `pick`, that selects the wrong node, or
 *    nothing, and the error grows as the roster lengthens.
 *
 * Making the transform a named function with the DOM node passed IN is what
 * keeps that honest: there is no frame ref in scope here to reach for by
 * accident.
 */

/**
 * Map a client-space pointer event to the normalised (0..1, 0..1) position
 * `scene.pick()` expects, or null when the element has no measurable box.
 *
 * The null case is not decoration: a canvas inside a `display:none` ancestor, or
 * one measured before layout, reports a zero rect, and dividing by zero would
 * hand `pick()` an Infinity that silently matches nothing (or, worse, matches
 * whatever node happens to be nearest to the origin of a degenerate space).
 */
export function pointerToNormalised(
  el: { getBoundingClientRect: () => { left: number; top: number; width: number; height: number } },
  e: { clientX: number; clientY: number },
): { nx: number; ny: number } | null {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return {
    nx: (e.clientX - r.left) / r.width,
    ny: (e.clientY - r.top) / r.height,
  };
}
