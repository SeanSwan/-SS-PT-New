/**
 * PostSaveHandoff.styles.ts — Crystalline Swan styling for the Post-Save Handoff.
 * Tokens: var(--token, #crystalline-fallback) only. Dual-Button Glow honored.
 * Motion: transform/opacity only, gated behind prefers-reduced-motion. Charts color = data-accent only.
 * Keyframes hoisted to module scope + referenced inside styled templates (Rule 43-safe).
 */
import styled, { keyframes, css } from 'styled-components';

const rise = keyframes`
  from { opacity: 0; transform: translate3d(0, 12px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
`;

const goldPulse = keyframes`
  0%   { opacity: 0; transform: scale(0.85); }
  40%  { opacity: 0.55; transform: scale(1.05); }
  100% { opacity: 0; transform: scale(1.35); }
`;

// Motion only when the viewer allows it; otherwise a designed static state.
const motionSafe = (rules: ReturnType<typeof css>) => css`
  @media (prefers-reduced-motion: no-preference) { ${rules} }
`;

export const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;
  background: var(--bg-base, #0A0A0F);
  padding: 16px;
`;

export const Card = styled.section`
  width: 100%;
  max-width: 1120px;
  background: var(--surface-card, #141419);
  border: 1px solid rgba(96, 192, 240, 0.14);
  border-radius: 24px;
  padding: 24px;
  color: var(--text-primary, #E0ECF4);
  ${motionSafe(css`animation: ${rise} 360ms cubic-bezier(0.16, 1, 0.3, 1) both;`)}

  /* Mobile: natural DOM order — declaration → proof → next-action. */
  @media (min-width: 1024px) {
    display: grid;
    grid-template-columns: 480px 560px;
    grid-template-areas:
      "decl  proof"
      "nba   proof";
    grid-template-rows: auto 1fr;
    column-gap: 40px;
    padding: 40px;
  }
`;

/* DOM order stays decl → proof → nba (mobile-correct); desktop places via grid-area. */
export const ZoneDecl = styled.div`@media (min-width: 1024px) { grid-area: decl; }`;
export const ZoneProof = styled.div`@media (min-width: 1024px) { grid-area: proof; align-self: center; }`;
export const ZoneNba = styled.div`@media (min-width: 1024px) { grid-area: nba; }`;

/* ── Zone 1 — declaration ─────────────────────────────────────────── */
export const Headline = styled.h1`
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-weight: 700;
  font-size: clamp(1.75rem, 2.5vw + 1rem, 2.5rem);
  line-height: 1.05;
  margin: 0 0 8px;
  color: var(--text-primary, #E0ECF4);
`;

export const Subline = styled.p`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: clamp(1.125rem, 1vw + 0.875rem, 1.375rem);
  line-height: 1.3;
  margin: 0 0 20px;
  color: rgba(224, 236, 244, 0.8);
`;

/* ── Zone 2 — proof ───────────────────────────────────────────────── */
export const Eyebrow = styled.p<{ $tone?: 'data' | 'accent' }>`
  font-family: 'Sora', system-ui, sans-serif;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 8px;
  color: ${({ $tone }) => ($tone === 'accent'
    ? 'var(--accent-primary, #60C0F0)'
    : 'var(--data-accent, #50A0F0)')};
`;

export const BigNumeral = styled.div<{ $pr?: boolean }>`
  position: relative;
  font-family: 'Fira Code', 'SFMono-Regular', monospace;
  font-variant-numeric: tabular-nums;
  font-size: clamp(2.75rem, 8vw + 1rem, 5rem);
  line-height: 1;
  color: ${({ $pr }) => ($pr ? 'var(--accent-gold, #C6A84B)' : 'var(--text-primary, #E0ECF4)')};
  ${({ $pr }) => $pr && css`text-shadow: 0 0 18px rgba(198, 168, 75, 0.45);`}
`;

export const GoldPulse = styled.span`
  position: absolute;
  inset: -20% -10%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(198, 168, 75, 0.5), transparent 70%);
  pointer-events: none;
  opacity: 0;
  ${motionSafe(css`animation: ${goldPulse} 600ms ease-out 3;`)}
`;

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 16px;
`;

export const Chip = styled.span`
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.875rem;
  padding: 4px 10px;
  border-radius: 8px;
  background: var(--bg-surface, #1A1A24);
  color: rgba(224, 236, 244, 0.85);
`;

export const ChartWrap = styled.div`
  position: relative;
  width: 100%;
`;

export const PendingChip = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.6875rem;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--accent-primary, #60C0F0);
  color: var(--accent-primary, #60C0F0);
`;

/* ── Zone 3 — next best action + share ────────────────────────────── */
export const NbaCard = styled.div`
  background: var(--bg-surface, #1A1A24);
  border-left: 3px solid var(--accent-primary, #60C0F0);
  border-radius: 12px;
  padding: 16px;
  margin: 8px 0 12px;
`;

export const NbaTitle = styled.p`
  font-family: 'Sora', system-ui, sans-serif;
  font-weight: 600;
  font-size: 1rem;
  margin: 0 0 4px;
  color: var(--text-primary, #E0ECF4);
`;

export const NbaBody = styled.p`
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.875rem;
  margin: 0 0 12px;
  color: rgba(224, 236, 244, 0.75);
`;

const buttonBase = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  border: none;
  border-radius: 12px;
  font-family: 'Sora', system-ui, sans-serif;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  color: var(--text-primary, #E0ECF4);
  ${motionSafe(css`transition: transform 120ms ease, box-shadow 200ms ease;`)}
  &:active { transform: scale(0.98); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

/* Primary: Royal Depth bg → Wing Purple glow. */
export const CtaButton = styled.button`
  ${buttonBase};
  background: var(--surface-elevated, #003080);
  box-shadow: 0 0 24px rgba(139, 92, 246, 0.45);
`;

/* Secondary: Wing Purple bg → Ice Wing glow. */
export const ShareButton = styled.button`
  ${buttonBase};
  background: var(--glow-accent, #8B5CF6);
  box-shadow: 0 0 24px rgba(96, 192, 240, 0.45);
  margin-top: 8px;
`;

export const ShareMicrocopy = styled.p`
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.75rem;
  margin: 8px 0 0;
  color: var(--accent-gold, #C6A84B);
`;

export const ShareNote = styled.p`
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.8125rem;
  margin: 8px 0 0;
  color: rgba(224, 236, 244, 0.7);
`;

export const DoneButton = styled.button`
  display: block;
  width: 100%;
  min-height: 44px;
  margin-top: 12px;
  background: transparent;
  border: none;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.9375rem;
  color: rgba(224, 236, 244, 0.7);
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;
