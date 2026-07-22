/**
 * FILE: RestoreCard.styles.ts
 * PURPOSE: Styled-components for the Restore panel — Kimi K4 design contract:
 *          Restore Ring, Wing Sweep, edge-rule travel, one-glow discipline,
 *          reduced-motion parity (distinct, stiller — never lesser).
 * PALETTE: Crystalline Swan tokens with fallbacks (Rule 6). 44px targets (Rule 2).
 */
import styled, { css, keyframes } from 'styled-components';

const sweep = keyframes`
  from { transform: rotate(0deg); opacity: 1; }
  to { transform: rotate(360deg); opacity: 0; }
`;

export const Card = styled.section<{ $complete: boolean }>`
  position: relative;
  background: var(--surface-card, #141419);
  border: 1px solid ${({ $complete }) => ($complete
    ? 'rgba(198, 168, 75, 0.4)'
    : 'rgba(96, 192, 240, 0.12)')};
  border-radius: 16px;
  padding: 16px;
  color: var(--text-primary, #e0ecf4);
  max-width: 560px;
  @media (max-width: 359px) { padding: 12px; }
`;

export const HeaderRow = styled.header`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
`;

export const Headline = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const HeaderMeta = styled.span`
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--text-secondary, #8aa2b8);
  white-space: nowrap;
`;

export const RingWrap = styled.div`
  position: relative;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
`;

export const SweepOverlay = styled.div`
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  pointer-events: none;
  background: conic-gradient(from 0deg,
    rgba(96, 192, 240, 0) 0deg,
    rgba(96, 192, 240, 0.5) 240deg,
    rgba(139, 92, 246, 0.6) 330deg,
    rgba(198, 168, 75, 0.9) 356deg,
    rgba(198, 168, 75, 0) 360deg);
  mask: radial-gradient(closest-side, transparent 72%, #000 74%); /* swan-guard-allow-hex mask alpha stop, not a brand color */
  animation: ${css`${sweep}`} 600ms ease-out forwards;
  @media (prefers-reduced-motion: reduce) { animation: none; opacity: 0; }
`;

export const Block = styled.section`
  margin-top: 14px;
`;

export const BlockLabel = styled.h4`
  margin: 0;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(96, 192, 240, 0.7);
`;

export const ProvenanceLine = styled.p`
  margin: 2px 0 8px;
  font-size: 0.8125rem;
  font-style: italic;
  color: var(--text-secondary, #8aa2b8);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const Row = styled.div<{ $done: boolean; $active: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  padding: 8px 4px;
  border-radius: 10px;
  ${({ $active }) => $active && css`
    box-shadow: inset 2px 0 0 var(--accent-primary, #60c0f0),
      0 0 12px rgba(96, 192, 240, 0.2);
    @media (prefers-reduced-motion: reduce) {
      box-shadow: inset 2px 0 0 var(--accent-primary, #60c0f0);
    }
  `}
  ${({ $done }) => $done && css`opacity: 0.62;`}
`;

export const ThumbButton = styled.button`
  width: 48px;
  height: 48px;
  min-width: 44px;
  min-height: 44px;
  flex: 0 0 48px;
  border-radius: 8px;
  border: 1px solid rgba(96, 192, 240, 0.15);
  background: var(--surface-elevated, #1a1a24) center/cover no-repeat;
  cursor: pointer;
  color: var(--text-secondary, #8aa2b8);
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8b5cf6); outline-offset: 2px; }
  @media (max-width: 359px) { width: 40px; flex-basis: 40px; }
`;

export const RowBody = styled.div`
  min-width: 0;
  flex: 1;
`;

export const RowName = styled.p<{ $done: boolean }>`
  position: relative;
  margin: 0;
  font-size: 0.9375rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${({ $done }) => $done && css`text-decoration: line-through;`}
`;

export const RowDose = styled.p`
  margin: 2px 0 0;
  font-size: 0.8125rem;
  color: var(--text-secondary, #8aa2b8);
`;

export const CheckButton = styled.button<{ $done: boolean }>`
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  border-radius: 50%;
  cursor: pointer;
  display: grid;
  place-items: center;
  border: 1.5px solid ${({ $done }) => ($done
    ? 'var(--accent-gold, #c6a84b)'
    : 'rgba(96, 192, 240, 0.4)')};
  background: ${({ $done }) => ($done ? 'rgba(198, 168, 75, 0.15)' : 'transparent')};
  color: ${({ $done }) => ($done ? 'var(--accent-gold, #c6a84b)' : 'var(--accent-primary, #60c0f0)')};
  transition: background 200ms ease, border-color 200ms ease;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8b5cf6); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export const StripButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  max-height: 72px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(96, 192, 240, 0.12);
  background: var(--surface-card, #141419);
  color: var(--text-primary, #e0ecf4);
  font-size: 0.875rem;
  cursor: pointer;
  text-align: left;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8b5cf6); outline-offset: 2px; }
`;

export const ColdBody = styled.div`
  display: grid;
  gap: 10px;
  padding: 6px 0 2px;
  font-size: 0.875rem;
  color: var(--text-secondary, #8aa2b8);
`;

export const CtaButton = styled.button`
  min-height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid rgba(198, 168, 75, 0.5);
  background: transparent;
  color: var(--accent-gold, #c6a84b);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  justify-self: start;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8b5cf6); outline-offset: 2px; }
`;

export const CompleteLine = styled.p`
  margin: 12px 0 0;
  font-size: 0.875rem;
  color: var(--accent-gold, #c6a84b);
`;

export const SheetOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 15, 0.7);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1200;
`;

export const Sheet = styled.div`
  width: min(560px, 100%);
  background: var(--surface-elevated, #1a1a24);
  border-radius: 16px 16px 0 0;
  border: 1px solid rgba(96, 192, 240, 0.15);
  padding: 16px;
  color: var(--text-primary, #e0ecf4);
  display: grid;
  gap: 8px;
`;

export const GhostRow = styled.div`
  height: 64px;
  border-radius: 10px;
  background: rgba(96, 192, 240, 0.08);
  @media (prefers-reduced-motion: no-preference) {
    animation: restorePulse 1.4s ease-in-out infinite;
    @keyframes restorePulse { 50% { opacity: 0.45; } }
  }
`;
