/**
 * ============================================================================
 * FILE: ObservatoryRankPill.styles.ts
 * PURPOSE: Gold LEVEL | RANK | TITLE pill for the profile cover (2026-07-14,
 *          Sean directive — the rank is the player's identity, it reads GOLD).
 * HOW IT FITS: Extracted from ObservatoryCoverHero.styles.ts (rule 4 size)
 *          when the rank-pill upgrade pushed that file past 300 lines.
 * KEY DECISIONS:
 * - Opaque dark pill surface so gold text never composites against a bright
 *   user cover photo (WCAG 4.5:1).
 * - Slow gilded shimmer at rest; celebrate pop + ring on level-up. All motion
 *   is prefers-reduced-motion-gated; reduced fallback is static gold.
 * - Shared fragments that interpolate keyframes use the css`` helper (rule 43).
 * ============================================================================
 */
import styled, { css, keyframes } from 'styled-components';

const rankShimmer = keyframes`
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
`;

const rankCelebratePop = keyframes`
  0% { transform: scale(1); }
  30% { transform: scale(1.12); }
  55% { transform: scale(0.98); }
  100% { transform: scale(1); }
`;

const rankCelebrateRing = keyframes`
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent-gold, #C6A84B) 55%, transparent); }
  100% { box-shadow: 0 0 0 22px color-mix(in srgb, var(--accent-gold, #C6A84B) 0%, transparent); }
`;

const rankGoldTextGradient = css`
  background: linear-gradient(
    100deg,
    var(--accent-gold, #C6A84B) 0%,
    #F4E3AE 22%,
    var(--accent-gold, #C6A84B) 45%,
    #B99B45 68%,
    var(--accent-gold, #C6A84B) 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: var(--accent-gold, #C6A84B); /* fallback if clip unsupported */
`;

export const CoverRankTag = styled.span<{ $celebrating?: boolean }>`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.14rem 0.42rem;
  width: fit-content;
  max-width: min(100%, 34rem);
  min-height: 34px;
  margin-top: 0.38rem;
  padding: 0.38rem 0.82rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 58%, transparent);
  /* Opaque dark surface: the gold text must never composite against a bright
     user-uploaded cover photo (WCAG 4.5:1 — the transparent variant dropped to
     ~2.8:1 over white photos). Both stops keep the backdrop ≥ 88% dark. */
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, var(--bg-base, #0A0A0F)),
      color-mix(in srgb, var(--bg-base, #0A0A0F) 92%, #000)
    );
  box-shadow:
    0 0 16px color-mix(in srgb, var(--accent-gold, #C6A84B) 22%, transparent),
    inset 0 1px 0 color-mix(in srgb, #F4E3AE 22%, transparent);
  font: 800 0.78rem/1.2 var(--font-data, 'Fira Code', monospace);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  white-space: normal;
  overflow-wrap: anywhere;

  @media (prefers-reduced-motion: no-preference) {
    ${({ $celebrating }) => ($celebrating
    ? css`animation: ${rankCelebratePop} 900ms ease, ${rankCelebrateRing} 1400ms ease;`
    : '')}
  }
`;

/* Gold gradient words with a slow luxury shimmer (static gold when reduced). */
export const RankGoldSegment = styled.span`
  ${rankGoldTextGradient}
  filter: drop-shadow(0 1px 6px color-mix(in srgb, var(--accent-gold, #C6A84B) 35%, transparent));

  @media (prefers-reduced-motion: no-preference) {
    animation: ${rankShimmer} 6s linear infinite;
  }
`;

export const RankDivider = styled.span`
  color: color-mix(in srgb, var(--accent-gold, #C6A84B) 55%, transparent);
  font-weight: 400;
`;
