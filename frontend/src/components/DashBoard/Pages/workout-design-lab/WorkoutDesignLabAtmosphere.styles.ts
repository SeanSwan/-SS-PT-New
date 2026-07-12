/**
 * ============================================================================
 * WORKOUT DESIGN LAB — ATMOSPHERE LAYER (electric ice · benevolent cyberpunk)
 * ============================================================================
 * BLUEPRINT: JWST-nebula CSS atmosphere + per-lens identity system + the
 * real A/B compare stage chrome. Pure CSS gradients (tier-3 safe, zero
 * assets); drift animation is opt-in via motion preference only.
 *
 * LAYERS
 *  NebulaField      fixed cosmic backdrop — deep-field radials in Wing
 *                   Purple / Ice Wing / Sapphire + gold star flecks + grain
 *  LensIdentityGlyph per-lens sigil — each of the 25 lenses renders its own
 *                   canvas color + accent ring (no two lenses look alike)
 *  LensDot          catalog swatch — the lens's canvas color as a 12px dot
 *  StageFrame       chrome around the live ScopedLensFrame stage
 *  Compare*         true side-by-side A/B panels (each hosts a real stage)
 * ============================================================================
 */
import styled, { css, keyframes } from "styled-components";
import { media, safeArea } from "../../../../styles/device-matrix";

const drift = keyframes`
  from { transform: translate3d(-2%, -1%, 0) scale(1); }
  50%  { transform: translate3d(2%, 1.5%, 0) scale(1.04); }
  to   { transform: translate3d(-2%, -1%, 0) scale(1); }
`;

const starfield = css`
  background-image:
    radial-gradient(1.5px 1.5px at 12% 24%, rgba(224, 236, 244, 0.9), transparent 60%),
    radial-gradient(1px 1px at 34% 68%, rgba(96, 192, 240, 0.8), transparent 60%),
    radial-gradient(1.5px 1.5px at 58% 12%, rgba(198, 168, 75, 0.85), transparent 60%),
    radial-gradient(1px 1px at 72% 82%, rgba(224, 236, 244, 0.7), transparent 60%),
    radial-gradient(2px 2px at 88% 38%, rgba(139, 92, 246, 0.75), transparent 60%),
    radial-gradient(1px 1px at 46% 44%, rgba(224, 236, 244, 0.55), transparent 60%),
    radial-gradient(1.5px 1.5px at 8% 78%, rgba(96, 192, 240, 0.6), transparent 60%);
`;

/**
 * Fixed deep-field nebula behind the whole Lab. Sits UNDER the lens canvas
 * tint (Lab surfaces are translucent now) so committed/previewed lenses
 * visibly recolor the page while the cosmos breathes underneath.
 */
export const NebulaField = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 90% 60% at 18% 8%, color-mix(in srgb, var(--wing-purple, #8b5cf6) 22%, transparent), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 18%, color-mix(in srgb, var(--ice-wing, #60c0f0) 18%, transparent), transparent 60%),
    radial-gradient(ellipse 80% 70% at 55% 92%, color-mix(in srgb, var(--midnight-sapphire, #002060) 65%, transparent), transparent 70%),
    radial-gradient(ellipse 40% 30% at 68% 55%, color-mix(in srgb, var(--gilded-fern, #c6a84b) 9%, transparent), transparent 65%);
  /* NO opaque base layer on purpose: the lens canvas beneath must stay
     visible so an applied Style Lens recolors this page (the original
     "all lenses look the same" bug was exactly this kind of covering). */

  &::before {
    content: "";
    position: absolute;
    inset: -6%;
    ${starfield};
    animation: ${drift} 90s ease-in-out infinite;
  }

  /* film grain kills the plastic-gradient look (design-system B rule) */
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0.04;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }
`;

/**
 * Per-lens sigil: concentric orbit ring + canvas core + accent seam.
 * $canvas / $accent come from SWAN_STYLE_LENS_VISUALS fallbacks, so all
 * 25 lenses present a genuinely different face in the explorer.
 */
export const LensIdentityGlyph = styled.div<{ $canvas: string; $accent: string }>`
  position: absolute;
  width: 230px;
  height: 230px;
  right: -70px;
  top: -70px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(
    circle at 38% 38%,
    color-mix(in srgb, ${({ $canvas }) => $canvas} 88%, #ffffff 12%),
    ${({ $canvas }) => $canvas} 46%,
    transparent 72%
  );
  border: 1px solid color-mix(in srgb, ${({ $accent }) => $accent} 55%, transparent);
  box-shadow:
    inset 0 0 55px color-mix(in srgb, ${({ $accent }) => $accent} 30%, transparent),
    0 0 70px color-mix(in srgb, ${({ $accent }) => $accent} 22%, transparent);

  &::before,
  &::after {
    content: "";
    position: absolute;
    inset: 28px;
    border: 1px solid color-mix(in srgb, ${({ $accent }) => $accent} 45%, transparent);
    transform: rotate(45deg);
  }

  &::after {
    inset: 63px;
    border-color: ${({ $accent }) => $accent};
    border-radius: 50%;
    transform: none;
  }
`;

/** Catalog swatch — the lens canvas as a physical color chip. */
export const LensDot = styled.i<{ $canvas: string; $accent: string }>`
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $canvas }) => $canvas};
  border: 1px solid ${({ $accent }) => $accent};
  box-shadow: 0 0 8px color-mix(in srgb, ${({ $accent }) => $accent} 60%, transparent);
`;

/** Chrome around the live stage — the lens preview is the jewel case. */
export const StageFrame = styled.div`
  position: relative;
  z-index: 1;
  margin: clamp(14px, 1.8vw, 28px);
  border-radius: calc(var(--lens-panel-radius, 16px) + 6px);
  border: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 28%, transparent);
  box-shadow:
    0 1px 0 rgba(96, 192, 240, 0.08) inset,
    0 20px 60px rgba(0, 16, 40, 0.45),
    0 0 120px rgba(139, 92, 246, 0.08);
  overflow: clip;

  ${media.phone} {
    margin: 10px;
  }
`;

/* ── Compare mode: two REAL stages, side by side ─────────────────────── */

export const CompareStageGrid = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(12px, 1.4vw, 20px);
  margin: clamp(14px, 1.8vw, 28px);

  ${media.max(940)} {
    grid-template-columns: minmax(0, 1fr);
    margin: 10px;
    padding-bottom: ${safeArea("bottom", "10px")};
  }
`;

export const ComparePane = styled.figure`
  margin: 0;
  min-width: 0;
  border-radius: calc(var(--lens-panel-radius, 16px) + 6px);
  border: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 26%, transparent);
  box-shadow: 0 16px 44px rgba(0, 16, 40, 0.4);
  overflow: clip;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
`;

export const ComparePaneCaption = styled.figcaption`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 8px 14px;
  background: linear-gradient(
    135deg,
    rgba(20, 20, 25, 0.92),
    rgba(26, 26, 36, 0.85)
  );
  border-bottom: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 20%, transparent);

  strong {
    font: 700 14px/1.2 "Plus Jakarta Sans", sans-serif;
    color: var(--frost-white, #e0ecf4);
  }

  span {
    font: 500 12px/1.3 "Sora", sans-serif;
    color: var(--text-secondary, #b8c8d8);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
