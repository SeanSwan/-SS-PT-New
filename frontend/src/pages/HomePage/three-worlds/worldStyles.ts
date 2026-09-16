/**
 * worldStyles — surface, canvas, type and control styling for the variant fleet.
 * @module pages/HomePage/three-worlds/worldStyles
 *
 * Layout structure (the 20 nav models and 20 grids) lives in `layout.ts`; this file
 * owns everything a variant paints regardless of its skeleton.
 *
 * House rules: styled-components only (rule 1); no hardcoded colours — every value
 * is the token-with-fallback pattern (rule 6); 44px minimum on anything interactive
 * (rule 2); dark-first (rule 3).
 */
import styled, { css, keyframes } from 'styled-components';
import { tokenCssVars } from './tokens';

/**
 * Rail reserves, keyed by nav model.
 *
 * These MUST be interpolated INSIDE WorldRoot, for two independent reasons that each
 * cost a round of hostile review:
 *   1. A `styled(WorldRoot)` descendant block is prefixed with the parent class,
 *      producing `.Surface section[data-nav-model=...]` — which can never match the
 *      surface element itself, so the reserve silently stayed 0px.
 *   2. A `const` referenced earlier in the module than its declaration is in its
 *      temporal dead zone and throws at import time. Hence: above WorldRoot.
 * `&&` raises specificity so the model rule beats the `0px` base declaration.
 */
const railReserve = css`
  &&[data-nav-model='vertical-index'],
  &&[data-nav-model='gutter-index'],
  &&[data-nav-model='stepper-left'] { --rail-left: 84px; }

  &&[data-nav-model='side-rail'],
  &&[data-nav-model='split-rail'],
  &&[data-nav-model='progress-spine'] { --rail-right: 92px; }

  @media (max-width: 640px) {
    /* Rails collapse to a top row below 640px, so no reserve is needed. */
    &&[data-nav-model] { --rail-left: 0px; --rail-right: 0px; }
  }
`;

export const WorldRoot = styled.section`
  position: relative;
  min-height: 100vh;
  width: 100%;
  overflow-x: clip;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #e0ecf4);
  isolation: isolate;
  /* Establishes the query container that Headline/Sub size themselves against, so
     type scales with the variant's own box rather than the browser viewport. */
  container-type: inline-size;

  /*
   * RAIL RESERVE — declared on the common ancestor of Nav and Content.
   *
   * This was broken TWICE and both times invisibly. First the reserves were declared
   * on Nav, but Nav and Content are SIBLINGS here and custom properties only inherit
   * DOWN, so Content always resolved the 0px fallback and a 76px rail sat on top of
   * the headline. Then the corrected rules were wrapped in a styled(WorldRoot)
   * descendant and scoped away from the element they were meant to style.
   * (No backticks in this comment: it lives inside a template literal.)
   */
  --rail-left: 0px;
  --rail-right: 0px;
  ${railReserve}

  /* 2% film grain against the plastic-AI-gradient look (atmospheric rules);
     purely textural, pointer-events none, between canvas (z-0) and content (z-2). */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
  }
`;

/**
 * Wrapper that carries the token declarations, so the custom properties the runtime
 * READS actually exist. Nothing declared them before, which meant every scene silently
 * rendered the hardcoded fallback palette.
 */
export const WorldSurface = styled(WorldRoot)`
  ${tokenCssVars()}
`;

/**
 * The canvas CONTAINER. The runtime creates and destroys the <canvas> inside it per
 * setup (a force-lost context can never be re-gotten on the same element, so the
 * element must die with each teardown and be recreated on rebuild — see runtime.ts).
 * The container is what React owns; it stays MOUNTED but hidden while the poster is
 * showing, rather than being unmounted, so the restore path after a recoverable
 * context loss keeps its home in the DOM.
 */
export const CanvasLayer = styled.div<{ $hidden?: boolean }>`
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: ${({ $hidden }) => ($hidden ? 0 : 0.9)};
  z-index: 0;

  & > canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
`;

/**
 * Static fallback. Always rendered in the markup and only faded out when a live
 * world mounts, so the page still sells if JS never runs (design-brain §12).
 */
export const Poster = styled.div<{ $hidden: boolean }>`
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: ${({ $hidden }) => ($hidden ? 0 : 1)};
  transition: opacity 240ms ease;
  background:
    radial-gradient(120% 90% at 50% 10%,
      color-mix(in srgb, var(--accent-primary, #60c0f0) 22%, transparent) 0%, transparent 60%),
    linear-gradient(160deg, var(--primary, #002060) 0%, var(--obsidian, #0a0a0f) 100%);
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export const Content = styled.div`
  position: relative;
  z-index: 2;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  /*
   * The rail reserve is declared by whichever nav model is active. Without it a
   * left rail sits directly on top of the headline — a real overlap bug, not a
   * cosmetic one. The fallback of 0 keeps rail-less models at normal padding.
   */
  padding-block: clamp(1.25rem, 3vw, 3rem);
  padding-left: calc(clamp(1.25rem, 4vw, 4rem) + var(--rail-left, 0px));
  padding-right: calc(clamp(1.25rem, 4vw, 4rem) + var(--rail-right, 0px));
  @media (max-width: 640px) {
    /* Rails collapse to a top row below 640px, so the reserve must drop too. */
    padding-left: clamp(1rem, 4vw, 2rem);
    padding-right: clamp(1rem, 4vw, 2rem);
  }
`;

export const Headline = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.01em;
  /* Soft purple-tinted depth, never a flat gray shadow (atmospheric rules). The
     text stays solid Frost White so contrast is measurable and WCAG-safe. */
  text-shadow: 0 2px 30px color-mix(in srgb, var(--wing-purple, #8b5cf6) 28%, transparent);
  /*
   * Sized against the CONTAINER, not the viewport. Inside a gallery card or a
   * short frame a 6vw headline overflows; container query units with a rem cap
   * keep it proportionate at every host size, and the rem floor keeps it legible.
   * (No backticks in this comment: it lives inside a template literal.)
   */
  font-size: clamp(1.6rem, 5cqi, 3.4rem);
  max-width: 20ch;
  margin: 0 0 0.5rem;
  text-wrap: balance;
`;

export const Sub = styled.p`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: clamp(0.95rem, 1.6cqi, 1.25rem);
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  max-width: 54ch;
  margin: 0;
`;

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
`;

/**
 * 44px touch target (rule 2). Dual-Button Glow (§74-76, mandatory): blue bg ->
 * Wing Purple glow; cyan accent -> Ice Wing glow. Hover-only metallic sheen on
 * the primary (awe surfaces); focus ring is the §503 signature, never removed.
 */
export const Action = styled.button<{ $intent: string }>`
  position: relative;
  overflow: hidden;
  min-height: 44px;
  padding: 0.7rem 1.5rem;
  border-radius: 9999px;
  font-family: 'Sora', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
  ${({ $intent }) => ($intent === 'primary'
    ? css`
      border: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 30%, transparent);
      background: linear-gradient(135deg, var(--primary, #002060), var(--royal-depth, #003080));
      color: var(--frost-white, #e0ecf4);
      box-shadow: 0 0 14px color-mix(in srgb, var(--wing-purple, #8b5cf6) 30%, transparent);
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 0 26px color-mix(in srgb, var(--wing-purple, #8b5cf6) 55%, transparent);
      }
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(115deg, transparent 30%,
          color-mix(in srgb, var(--frost-white, #e0ecf4) 22%, transparent) 50%, transparent 70%);
        transform: translateX(-120%);
        transition: transform 420ms ease;
      }
      &:hover::after { transform: translateX(120%); }
    `
    : css`
      border: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 45%, transparent);
      background: color-mix(in srgb, var(--obsidian, #0a0a0f) 35%, transparent);
      color: var(--ice-wing, #60c0f0);
      &:hover {
        transform: translateY(-1px);
        border-color: color-mix(in srgb, var(--ice-wing, #60c0f0) 70%, transparent);
        box-shadow: 0 0 22px color-mix(in srgb, var(--ice-wing, #60c0f0) 38%, transparent);
      }
    `)}
  &:focus-visible {
    outline: 2px solid transparent;
    box-shadow:
      0 0 0 2px var(--obsidian, #0a0a0f),
      0 0 0 4px var(--wing-purple, #8b5cf6),
      0 0 12px 4px color-mix(in srgb, var(--wing-purple, #8b5cf6) 55%, transparent);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
    &::after { display: none; }
  }
`;

/** Proof figures. Monospace so the numbers read as data, not as marketing; a gold
 *  hairline anchors the row as an editorial block rather than a floating list. */
export const ProofRow = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  list-style: none;
  margin: 0;
  padding: 0.65rem 0 0;
  border-top: 1px solid color-mix(in srgb, var(--gilded-fern, #c6a84b) 32%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));
  li { display: flex; gap: 0.45rem; align-items: baseline; }
  b { color: var(--gilded-fern, #c6a84b); font-weight: 600; }
`;

/** Scroll cue; suppressed for grids that own their own scroll axis. */
export const ScrollHint = styled.div<{ $hide: boolean }>`
  position: absolute;
  bottom: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  display: ${({ $hide }) => ($hide ? 'none' : 'block')};
`;

const drift = keyframes`0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); }`;

/** The one motion on the page, and it performs a job: it points down. */
export const CueDot = styled.span`
  display: inline-block;
  margin-left: 0.4rem;
  animation: ${drift} 2.4s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

/** Shown instead of the canvas when motion resolves to the poster path. */
export const StaticNote = styled.p`
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.55));
`;
