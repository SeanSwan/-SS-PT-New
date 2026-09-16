/**
 * layout — the 20 navigation models and the 20 content grids, as real CSS.
 * @module pages/HomePage/three-worlds/layout
 *
 * WHY THE STRUCTURE LIVES IN CSS AND NOT IN PROPS
 * A nav model is not decoration: "no top bar, an overlay drawer instead" changes
 * which pixels exist and in what order. Encoding each of the 20 nav models and 20
 * grids as a real CSS rule is what makes the divergence declared in
 * `skeletons.ts` visible on screen instead of merely asserted in a test.
 *
 * Split from `worldStyles.ts` to respect the rule-4 line cap, and because the
 * layout axis is the one a designer actually wants to read on its own.
 *
 * House rules: styled-components only (rule 1); no hardcoded colours — every value
 * is the token-with-fallback pattern (rule 6); 44px minimum on anything interactive
 * (rule 2); dark-first (rule 3).
 */
import styled, { css } from 'styled-components';
import type { NavModel, GridModel } from './skeletons';

/** Shared nav framing. Rendered as a `nav` element so it lands in the a11y tree. */
export const Nav = styled.nav<{ $model: NavModel }>`
  position: relative;
  z-index: 3;
  display: flex;
  gap: 0.5rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.02em;

  /*
   * NOTE: the rail reserve (--rail-left / --rail-right) is deliberately NOT declared
   * here. It is consumed by Content, which is a SIBLING of this element, and custom
   * properties only inherit downward — so declaring it here made the reserve dead
   * code. It now lives on the WorldRoot surface, keyed off data-nav-model. Do not
   * move it back.
   */

  ${({ $model }) => {
    switch ($model) {
      case 'no-nav':
        // The boldest variant: no wayfinding chrome at all. Every section must be
        // reachable by scroll alone, which is a real usability cost (see tradeoff).
        return css`display: none;`;
      case 'vertical-index':
      case 'gutter-index':
      case 'stepper-left':
        // absolute, not fixed: the rail belongs to its own page, so it must not
        // escape the variant and pin itself over the viewport — which is exactly
        // what happened when twenty variants rendered on one QA page.
        return css`
          position: absolute; left: 0; top: 0; bottom: 0; width: 68px;
          flex-direction: column; justify-content: center; padding: 0 0.5rem;
          background: color-mix(in srgb, var(--obsidian, #0a0a0f) 72%, transparent);
        `;
      case 'side-rail':
      case 'split-rail':
      case 'progress-spine':
        return css`
          position: absolute; right: 0; top: 0; bottom: 0; width: 76px;
          flex-direction: column; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--primary, #002060) 60%, transparent);
        `;
      case 'horizon-bar':
      case 'command-strip':
      case 'sticky-minimal':
        return css`
          position: sticky; top: 0; padding: 0.5rem 1rem;
          background: color-mix(in srgb, var(--obsidian, #0a0a0f) 82%, transparent);
          backdrop-filter: blur(10px);
        `;
      case 'ticker-nav':
        return css`
          flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none;
          &::-webkit-scrollbar { display: none; }
        `;
      case 'chapter-dots':
      case 'edge-tabs':
        return css`
          position: absolute; bottom: 0; left: 0; right: 0; justify-content: center;
          padding: 0.4rem;
          background: color-mix(in srgb, var(--obsidian, #0a0a0f) 70%, transparent);
        `;
      case 'radial-hub':
      case 'orbital':
        return css`
          justify-content: center; flex-wrap: wrap; padding: 0.35rem 0;
          border-block: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 25%, transparent);
        `;
      case 'floating-pill':
        return css`
          position: absolute; top: 1rem; left: 50%; transform: translateX(-50%);
          padding: 0.35rem; border-radius: 9999px;
          background: color-mix(in srgb, var(--primary, #002060) 75%, transparent);
          backdrop-filter: blur(12px);
        `;
      case 'corner-anchor':
      case 'command-palette':
      case 'overlay-drawer':
        return css`position: absolute; top: 1rem; right: 1rem; justify-content: flex-end;`;
      case 'split-header':
        return css`justify-content: space-between; width: 100%; padding: 0.5rem 0;`;
      default:
        return css`padding: 0.5rem 0;`;
    }
  }}

  @media (max-width: 640px) {
    /* Side rails would eat a phone's width; collapse them to a top row. */
    position: static;
    flex-direction: row;
    width: auto;
    justify-content: flex-start;
    flex-wrap: wrap;
    padding: 0.4rem 0;
  }
`;

/*
 * Nav pills are glass WITH A JOB: they float over a moving WebGL scene, so the
 * blur is a legibility depth tool, not decoration (glass as depth tool rule).
 * Electric border brightens on hover with a soft cyan tinted shadow; the focus
 * ring is the house signature (obsidian inner ring + purple ring).
 */
const navLink = css`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 0.95rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  background: color-mix(in srgb, var(--obsidian, #0a0a0f) 55%, transparent);
  backdrop-filter: blur(8px);
  border: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 22%, transparent);
  border-radius: 9999px;
  cursor: pointer;
  transition: color 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
  &:hover {
    color: var(--ice-wing, #60c0f0);
    border-color: color-mix(in srgb, var(--ice-wing, #60c0f0) 55%, transparent);
    box-shadow: 0 0 14px color-mix(in srgb, var(--ice-wing, #60c0f0) 26%, transparent);
  }
  &:focus-visible {
    outline: 2px solid transparent;
    box-shadow:
      0 0 0 2px var(--obsidian, #0a0a0f),
      0 0 0 4px var(--wing-purple, #8b5cf6),
      0 0 10px 3px color-mix(in srgb, var(--wing-purple, #8b5cf6) 50%, transparent);
  }
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export const NavItem = styled.button`
  ${navLink}
`;

export const Chapters = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  display: flex;
  flex-direction: column;
`;

/** One band per chapter. Band height differs per grid so pages scroll differently. */
export const Chapter = styled.div<{ $grid: GridModel; $i: number }>`
  flex: 1 1 auto;
  min-height: ${({ $grid }) => {
    switch ($grid) {
      case 'single-measure': return '52vh';
      case 'magazine-index':
      case 'editorial-offset': return '44vh';
      case 'horizontal-scroll': return '70vh';
      case 'dashboard-sheet':
      case 'admin-table': return '34vh';
      default: return '40vh';
    }
  }};
  border-top: 1px solid
    ${({ $i }) => ($i % 2 === 0
      ? 'color-mix(in srgb, var(--ice-wing, #60c0f0) 14%, transparent)'
      : 'transparent')};
`;

/** Editorial kicker: small, widely tracked, opened by a Gilded Fern rule so the
 *  section reads as typeset hierarchy rather than a second heading. */
export const SectionLabel = styled.h2<{ $grid: GridModel }>`
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ice-wing, #60c0f0);
  margin: 0 0 0.2rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-align: ${({ $grid }) => ($grid === 'editorial-spread' ? 'left' : 'inherit')};
  &::before {
    content: '';
    width: 1.4rem;
    height: 1px;
    background: var(--gilded-fern, #c6a84b);
    box-shadow: 0 0 8px color-mix(in srgb, var(--gilded-fern, #c6a84b) 55%, transparent);
  }
`;

/** The content grid. full-bleed and single-measure must look nothing alike. */
export const Grid = styled.div<{ $grid: GridModel }>`
  display: grid;
  gap: clamp(0.9rem, 2.5vw, 2rem);
  ${({ $grid }) => {
    switch ($grid) {
      case 'full-bleed':
        return css`grid-template-columns: repeat(6, 1fr); margin-inline: calc(-1 * clamp(1.5rem, 4vw, 4rem));`;
      case 'single-measure':
        return css`grid-template-columns: minmax(0, 68ch);`;
      case 'bento':
        return css`grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); grid-auto-rows: minmax(140px, auto);`;
      case 'asymmetric-bento':
        return css`grid-template-columns: 2fr 1fr 1fr; grid-auto-rows: minmax(120px, auto);`;
      case 'three-rail':
      case 'rail-well':
        return css`grid-template-columns: 1fr 2fr 1fr;`;
      case 'editorial-spread':
      case 'editorial-offset':
        return css`grid-template-columns: 1fr 1.6fr; column-gap: 4vw;`;
      case 'kanban-columns':
        return css`grid-template-columns: repeat(4, minmax(180px, 1fr)); align-items: start;`;
      case 'dashboard-sheet':
      case 'admin-table':
        return css`grid-template-columns: repeat(12, 1fr); row-gap: 0.4rem; font-family: 'Fira Code', monospace;`;
      case 'magazine-index':
        return css`grid-template-columns: 4rem 1fr; row-gap: 0.35rem;`;
      case 'horizontal-scroll':
        return css`grid-auto-flow: column; grid-auto-columns: minmax(260px, 1fr); overflow-x: auto;`;
      case 'stacked-bands':
        return css`grid-template-columns: 1fr;`;
      case 'spotlight-grid':
        return css`grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));`;
      case 'orbit-ring':
        return css`grid-template-columns: repeat(3, 1fr); justify-items: center;`;
      case 'timeline-spine':
        return css`grid-template-columns: 3rem 1fr; row-gap: 0.6rem;`;
      case 'product-shelf':
        return css`
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          border-top: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 20%, transparent);
          padding-top: 1rem;
        `;
      case 'evidence-grid':
        return css`grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 3vw;`;
      case 'editorial-cards':
        return css`grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));`;
      default:
        return css`grid-template-columns: 1fr;`;
    }
  }}

  @media (max-width: 900px) {
    /* Every multi-column grid must collapse; nothing may overlap or clip on phone. */
    grid-template-columns: 1fr !important;
    margin-inline: 0;
  }
`;
