/**
 * ============================================================================
 * FILE: DashboardV3BannerStageStyles.ts
 * PURPOSE: Feed Banner Studio Slice 2 (2026-06-13) — the premium "Stage" cover
 *          layouts: Atrium (3D coverflow) and Vitrine (hero + thumbnail rail).
 * AUTHOR: Claude Opus 4.8 | CREATED: 2026-06-13
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Two full-bleed, auto-advancing gallery stages that map
 * the Feed Banner Studio prototype onto the shared cover engine. Because the
 * cover host is decorative (aria-hidden + pointer-events:none), the active
 * frame is driven by the media layer's interval exactly like the crossfade
 * hero — there is NO in-cover nav/click (that lives in the editor, Slice 3).
 *
 * KEY DECISIONS:
 * - Atrium geometry is parametrized by CSS custom properties (--atrium-tx/tz/
 *   ry/sc/op/sat/br) set per-frame by the media layer from its offset-to-active
 *   math, so the 3D coverflow needs no per-frame styled-component.
 * - Crystalline Swan tokens with #fallbacks throughout (rule 6).
 * - Rule 43: the only interpolation into a composed chunk is the $hero css``
 *   conditional, wrapped in the css helper (no keyframes baked to strings).
 * - Every transition is killed under prefers-reduced-motion; will-change is
 *   scoped to no-preference so reduced-motion users pay no permanent GPU layer
 *   (matches the M5a discipline). The active-index INTERVAL is disabled in the
 *   media layer for reduced-motion, so these stages render statically there.
 */

import styled, { css } from 'styled-components';

/* shared full-bleed media for every stage frame (hero + atrium slots + thumbs).
   Absolute inset:0 (not height:100%) so it fills its positioned frame regardless
   of the flexbox percentage-height gotcha — every stage frame below establishes
   a positioning context. Same robust pattern the crossfade slides use. */
const stageMediaCss = css`
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: var(--banner-object-position, center center);
  user-select: none;
  -webkit-user-drag: none;
`;

export const BannerStageImage = styled.img`
  ${stageMediaCss}
`;

export const BannerStageVideo = styled.video`
  ${stageMediaCss}
`;

/* play affordance over video stage frames (decorative, aria-hidden) */
export const BannerStagePlayOrb = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 4;
  transform: translate(-50%, -50%);
  width: clamp(44px, 6vw, 60px);
  height: clamp(44px, 6vw, 60px);
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--text-primary, #E0ECF4);
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 88%, transparent),
    color-mix(in srgb, var(--bg-base, #0A0A0F) 55%, var(--accent-primary, #60C0F0))
  );
  /* Dual-Button Glow: purple surface -> cyan glow. */
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--text-primary, #E0ECF4) 25%, transparent),
    0 0 30px color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent);
  backdrop-filter: blur(6px);
  pointer-events: none;
`;

/* ════════════════════════════════════════════════════════════════════════
   ATRIUM — 3D coverflow gallery (hero in focus, side frames receding)
   ════════════════════════════════════════════════════════════════════════ */
export const BannerStageAtrium = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  perspective: 1600px;
  pointer-events: none;
  background: var(--bg-elevated, #10131A);
`;

export const BannerStageAtriumTrack = styled.div`
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
`;

export const BannerStageAtriumSlot = styled.div<{ $hero: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 46%;
  height: 80%;
  border-radius: 16px;
  overflow: hidden;
  z-index: 1;
  /* geometry comes from the media layer's offset math, as CSS custom props */
  transform:
    translate(-50%, -50%)
    translateX(var(--atrium-tx, 0))
    translateZ(var(--atrium-tz, 0px))
    rotateY(var(--atrium-ry, 0deg))
    scale(var(--atrium-sc, 1));
  opacity: var(--atrium-op, 1);
  filter: saturate(var(--atrium-sat, 1)) brightness(var(--atrium-br, 1));
  transition:
    transform 800ms var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)),
    opacity 800ms var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)),
    filter 800ms ease;
  box-shadow:
    0 30px 60px -24px color-mix(in srgb, var(--bg-base, #0A0A0F) 85%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);

  ${({ $hero }) =>
    $hero &&
    css`
      box-shadow:
        0 40px 90px -30px color-mix(in srgb, var(--bg-base, #0A0A0F) 90%, transparent),
        inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent),
        0 0 70px -10px color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
    `}

  @media (prefers-reduced-motion: no-preference) {
    will-change: transform, opacity;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
  @media (max-width: 768px) {
    width: 64%;
  }
`;

/* ════════════════════════════════════════════════════════════════════════
   VITRINE — hero frame + vertical thumbnail rail
   ════════════════════════════════════════════════════════════════════════ */
export const BannerStageVitrine = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  gap: clamp(8px, 1vw, 14px);
  padding: clamp(8px, 1vw, 14px);
  overflow: hidden;
  pointer-events: none;
  background: var(--bg-elevated, #10131A);
`;

export const BannerStageVitrineHero = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent),
    0 0 60px -18px color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);

  > ${BannerStageImage},
  > ${BannerStageVideo} {
    object-fit: contain;
  }
`;

export const BannerStageVitrineRail = styled.div`
  flex: 0 0 clamp(96px, 16%, 200px);
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 0.8vw, 10px);
  min-height: 0;
  overflow: hidden;

  @media (max-width: 768px) {
    flex-basis: 84px;
  }
`;

export const BannerStageVitrineThumb = styled.div`
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  border-radius: 12px;
  overflow: hidden;
  opacity: 0.82;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  transition: opacity 400ms ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
type SmartSkin = 'crystal' | 'ocean' | 'forest' | 'forge';

const smartSkinSurface: Record<SmartSkin, string> = {
  crystal: `linear-gradient(145deg,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent),
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, var(--bg-base, #0A0A0F)))`,
  ocean: `linear-gradient(145deg,
    color-mix(in srgb, var(--accent-data, #50A0F0) 30%, transparent),
    color-mix(in srgb, var(--surface-primary, #003080) 64%, var(--bg-base, #0A0A0F)))`,
  forest: `linear-gradient(145deg,
    color-mix(in srgb, var(--success, #2BDD66) 20%, transparent),
    color-mix(in srgb, var(--bg-elevated, #10131A) 64%, var(--primary-dark, #002060)))`,
  forge: `linear-gradient(145deg,
    color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent),
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, var(--bg-base, #0A0A0F)))`,
};

export const BannerStageSmart = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(92px, 18%, 210px);
  gap: clamp(8px, 1vw, 14px);
  padding: clamp(8px, 1vw, 14px);
  overflow: hidden;
  pointer-events: none;
  background: radial-gradient(circle at 20% 12%, color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent), transparent 34%),
    var(--bg-elevated, #10131A);

  @media (max-width: 700px) {
    grid-template-columns: minmax(0, 1fr) clamp(76px, 24%, 112px);
  }
`;

export const BannerStageSmartBackdrop = styled.div`
  position: absolute;
  inset: -28px;
  z-index: 0;
  opacity: 0.44;
  filter: blur(22px) saturate(1.25) brightness(0.82);
  transform: scale(1.07);
`;

export const BannerStageSmartAura = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(90deg,
      color-mix(in srgb, var(--bg-base, #0A0A0F) 76%, transparent),
      transparent 44%,
      color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent)),
    radial-gradient(circle at 84% 24%, color-mix(in srgb, var(--accent-gold, #C6A84B) 18%, transparent), transparent 30%);
`;

export const BannerStageSmartHero = styled.div`
  position: relative;
  z-index: 2;
  min-width: 0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent),
    0 36px 80px -28px color-mix(in srgb, var(--bg-base, #0A0A0F) 90%, transparent),
    0 0 72px -20px color-mix(in srgb, var(--accent-primary, #60C0F0) 48%, transparent);
  ${BannerStageImage},
  ${BannerStageVideo} {
    object-fit: contain;
  }
`;

export const BannerStageSmartRail = styled.div`
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-rows: repeat(4, minmax(0, 1fr));
  gap: clamp(6px, 0.8vw, 10px);
  min-height: 0;
`;

export const BannerStageSmartTile = styled.div<{ $skin: SmartSkin }>`
  position: relative;
  min-height: 0;
  border-radius: 12px;
  overflow: hidden;
  background: ${({ $skin }) => smartSkinSurface[$skin]};
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0 42%, color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent) 48%, transparent 56%);
    opacity: 0.38;
  }
`;
