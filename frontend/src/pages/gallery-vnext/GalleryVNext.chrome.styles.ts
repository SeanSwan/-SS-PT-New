/**
 * Gallery vNext — chrome styles (hero, event cards, download bar, photographer note, skeleton).
 * Split from GalleryVNext.styles.ts for the 300-line cap. ZERO raw hex — every color reads
 * `var(--gallery-*)` from the token bridge (CI-enforced). Shimmer animates OPACITY only (Kimi b7:
 * aspect-reserved facet shimmer — never blur/filter animation).
 */
import styled, { keyframes } from 'styled-components';

// ── Hero (pre-gate landing moment; calm public-tier, one primary) ─────────
export const Hero = styled.section`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  padding: clamp(48px, 9vh, 96px) 0 40px;
`;

export const HeroEyebrow = styled.span`
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gallery-ice);
`;

export const HeroHeadline = styled.h1`
  margin: 0;
  font-family: var(--gallery-font-display);
  font-size: clamp(2rem, 5.5vw, 3.4rem);
  line-height: 1.06;
  max-width: 16ch;
`;

export const HeroSub = styled.p`
  margin: 0;
  color: var(--gallery-ink-2);
  font-size: clamp(1rem, 1.6vw, 1.15rem);
  line-height: 1.5;
  max-width: 52ch;
`;

export const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
`;

/** The ONLY primary on the events surface — the sanctioned "surface" variant (see gallery.tokens.ts).
 *  Kimi b2: resting glow is quiet (14px); the 28px bloom is EARNED on hover/focus, never resting. */
export const HeroPrimary = styled.button`
  min-height: var(--gallery-target, 48px);
  padding: 0 22px;
  border: 0;
  border-radius: var(--gallery-r-card, 12px);
  background: var(--gallery-surface-2);
  color: var(--gallery-ink);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 0 0 1px var(--gallery-chrome-edge), 0 4px 14px var(--gallery-wing-22);
  transition: transform 160ms var(--gallery-ease-standard), box-shadow 160ms var(--gallery-ease-standard);
  &:hover, &:focus-visible {
    transform: translateY(-1px);
    box-shadow: 0 0 0 1px var(--gallery-chrome-edge), 0 8px 28px var(--gallery-wing-22);
  }
`;

/** The ONE brand accent on the pre-gate hero — a STATIC ice→wing gradient clip on a single h1 word.
 *  The old infinite sheen loop is dead (Kimi gallery review 2026-07-20: an ambient loop on the first thing
 *  you read is the template-tell, and it competed with the Crystallize overlay — two signatures = none). */
export const GradientWord = styled.span`
  display: inline-block;
  background: linear-gradient(100deg, var(--gallery-ice), var(--gallery-wing), var(--gallery-ice));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

export const HeroSecondary = styled.a`
  display: inline-flex;
  align-items: center;
  min-height: var(--gallery-target, 48px);
  padding: 0 18px;
  border-radius: var(--gallery-r-card, 12px);
  border: 1px solid var(--gallery-line);
  color: var(--gallery-ink-2);
  text-decoration: none;
  font-size: 0.95rem;
  &:hover { color: var(--gallery-ink); border-color: var(--gallery-chrome-edge); }
`;

// Event cards are now EventDeck.tsx (Direction A cascading accordion) — the old flat cover-card styles
// (EventCover/CoverBadge/CoverCount/EventBody) were deleted with them.

// ── Gated header chrome ───────────────────────────────────────────────────
export const BackLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 8px;
  margin: 16px 0 4px -8px;
  border: 0;
  background: none;
  color: var(--gallery-ink-2);
  font-size: 0.95rem;
  cursor: pointer;
  &:hover { color: var(--gallery-ink); }
`;

export const PhotographerNote = styled.blockquote`
  margin: 18px 0 4px;
  padding: 14px 18px;
  border-left: 2px solid var(--gallery-ice);
  border-radius: 0 var(--gallery-r-card, 12px) var(--gallery-r-card, 12px) 0;
  background: var(--gallery-glass);
  color: var(--gallery-ink-2);
  font-style: italic;
  line-height: 1.55;
  max-width: 70ch;
`;

export const Attribution = styled.span`
  display: block;
  margin-top: 8px;
  font-style: normal;
  font-size: 0.85rem;
  color: var(--gallery-ink);
`;

export const DownloadAllBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 18px 0 8px;
`;

export const DownloadAllButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: var(--gallery-target, 48px);
  padding: 0 18px;
  border-radius: var(--gallery-r-card, 12px);
  border: 1px solid var(--gallery-chrome-edge);
  background: var(--gallery-surface-1);
  color: var(--gallery-ink);
  font-size: 0.95rem;
  cursor: pointer;
  &:disabled { opacity: 0.6; cursor: progress; }
`;

export const DownloadAllHint = styled.span`
  color: var(--gallery-ink-2);
  font-size: 0.82rem;
`;

// ── Skeleton (Kimi b7: aspect-reserved shimmer, opacity-only) ─────────────
const shimmerPulse = keyframes`
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.85; }
`;

export const SkeletonRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
`;

export const SkeletonTile = styled.div<{ $flex: number; $h?: number }>`
  flex: ${(p) => p.$flex} 1 0;
  height: ${(p) => p.$h ?? 200}px;
  border-radius: var(--gallery-r-card, 12px);
  background: linear-gradient(135deg, var(--gallery-surface-2) 0%, var(--gallery-card-hi) 55%, var(--gallery-surface-2) 100%);
  animation: ${shimmerPulse} 1.6s var(--gallery-ease-standard) infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.6;
  }
`;
