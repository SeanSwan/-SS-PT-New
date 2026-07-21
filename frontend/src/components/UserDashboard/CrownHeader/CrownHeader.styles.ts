/**
 * ============================================================================
 * FILE: CrownHeader.styles.ts — FUSION F2 (02-wireframes §1-2 taste anchors)
 * PURPOSE: Styles for the user-dashboard Crown Header + Looks Carousel.
 * Crystalline Swan tokens with fallbacks; Dual-Button Glow on Wear; 44px
 * targets; band collapses to 148px on short viewports so Home's
 * next-best-action stays above the fold.
 * ============================================================================
 */
import styled from 'styled-components';

export const CrownShell = styled.section`
  position: relative;
  overflow: hidden;
  margin: 0 0 18px;
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  background: var(--bg-elevated, #141419);
  min-height: clamp(180px, 24vh, 260px); /* desktop clamp per 02-wireframes §2 */
  @media (max-width: 1023px) { min-height: clamp(148px, 26vh, 220px); }
  @media (max-height: 700px) { min-height: 148px; }
`;

/** Decorative wash — the look's own colors breathe behind the content. */
export const CrownBand = styled.div<{ $canvas: string; $accent: string }>`
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 70% at 18% 0%, color-mix(in srgb, ${({ $accent }) => $accent} 26%, transparent), transparent 62%),
    linear-gradient(150deg, color-mix(in srgb, ${({ $canvas }) => $canvas} 88%, transparent), var(--bg-base, #030712) 78%);
`;

export const CrownContent = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  padding: clamp(14px, 2.4vw, 24px);
  /* ≤700px-tall viewports: the band collapses toward its 148px minimum so
     Home's next-best-action stays above the fold (02-wireframes §2). */
  @media (max-height: 700px) {
    gap: 6px;
    padding: 10px 14px;
  }
`;

export const CrownTopRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
`;

export const Kicker = styled.p`
  margin: 0;
  color: var(--accent-primary, #60C0F0);
  font: 800 0.68rem/1.2 "Fira Code", monospace;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

export const LookName = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 800 clamp(24px, 3vw, 40px)/1.05 "Plus Jakarta Sans", sans-serif;
  letter-spacing: -0.03em;
  @media (max-height: 700px) { font-size: 20px; }
`;

export const LookDescription = styled.p`
  margin: 0;
  max-width: 62ch;
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
  font: 500 14px/1.5 "Plus Jakarta Sans", sans-serif;
  @media (max-height: 700px) { display: none; }
`;

export const CarouselRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0; /* grid-item overflow guard — keeps the rail inside the shell */
`;

export const CarouselRail = styled.ul`
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 10px;
  margin: 0;
  padding: 4px 2px;
  list-style: none;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent) transparent;
  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  }
  &::-webkit-scrollbar-track { background: transparent; }
`;

export const LookItem = styled.li`
  flex: 0 0 auto;
  scroll-snap-align: start;
`;

export const LookCard = styled.button<{ $canvas: string; $accent: string; $active: boolean }>`
  min-width: 148px;
  min-height: 64px;
  display: grid;
  gap: 4px;
  align-content: center;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  border-radius: 14px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent)'};
  background:
    linear-gradient(160deg, color-mix(in srgb, ${({ $canvas }) => $canvas} 82%, transparent), var(--bg-card, #141419));
  color: var(--text-primary, #E0ECF4);
  font: 720 13px/1.3 "Sora", sans-serif;
  box-shadow: ${({ $active, $accent }) =>
    $active ? `0 0 18px color-mix(in srgb, ${$accent} 35%, transparent)` : 'none'};
  &:focus-visible { outline: 3px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
`;

export const CardMetaRow = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font: 700 9px/1 "Fira Code", monospace;
  color: var(--accent-primary, #60C0F0);
`;

export const WornBadge = styled.em`
  font-style: normal;
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  color: var(--text-primary, #E0ECF4);
`;

export const V2Tag = styled.i`
  font-style: normal;
  margin-left: auto;
  color: var(--accent-gold, #C6A84B);
`;

export const ArrowButton = styled.button`
  flex: 0 0 auto;
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  &:focus-visible { outline: 3px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
`;

export const Caption = styled.p`
  margin: 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  font: 600 12px/1.4 "Sora", sans-serif;
  @media (max-height: 700px) { display: none; }
`;

export const SignInLine = styled.p`
  margin: 0;
  color: var(--accent-primary, #60C0F0);
  font: 650 12px/1.4 "Sora", sans-serif;
`;

export const WearButton = styled.button`
  justify-self: start;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 13px;
  cursor: pointer;
  border: 1px solid var(--accent-primary, #60C0F0);
  background: var(--accent-primary-deep, #002060);
  color: var(--text-primary, #E0ECF4);
  font: 800 14px/1 "Sora", sans-serif;
  box-shadow: 0 0 24px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 36%, transparent);
  &:focus-visible { outline: 3px solid var(--accent-secondary, #8B5CF6); outline-offset: 3px; }
`;
