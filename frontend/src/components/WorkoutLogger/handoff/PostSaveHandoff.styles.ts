/**
 * PostSaveHandoff.styles.ts — Crystalline Swan styling for the Post-Save Handoff.
 * Colors are token-with-fallback only (Rule 6): every literal is wrapped `var(--token, <fallback>)`,
 * including alpha/glow washes. No retired Galaxy-Swan values. Dual-Button Glow honored.
 * Motion: transform/opacity only, ALL of it gated behind prefers-reduced-motion. Charts = data-accent only.
 * Keyframes hoisted to module scope + referenced only inside css`` templates (Rule 43-safe).
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
  position: fixed;
  inset: 0;
  /* Full-screen takeover: must clear the Workout Logger's own furniture (rest timer ~9990, sticky
     action bar ~9989), toasts (~9999) and PostWorkoutCelebration (~9999) when wired in Slice 2.
     Slice-2 note: render through a portal to document.body so no ancestor stacking context caps it. */
  z-index: var(--z-post-save-handoff, 10001);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;
  overscroll-behavior: contain; /* a fling to the scroll boundary must not chain into the logger body behind */
  background: var(--bg-base, #0A0A0F);
  padding: 16px;
`;

export const Card = styled.section`
  position: relative; /* anchors the 1.4a one-shot CelebrationBurst canvas (absolute, inset 0) */
  width: 100%;
  max-width: 1120px;
  background: var(--surface-card, #141419);
  border: 1px solid var(--handoff-card-border, rgba(96, 192, 240, 0.14));
  border-radius: 24px;
  padding: 24px;
  color: var(--text-primary, #E0ECF4);
  ${motionSafe(css`animation: ${rise} 360ms cubic-bezier(0.16, 1, 0.3, 1) both;`)}

  /* Mobile: natural DOM order — declaration → proof → next-action. */
  @media (min-width: 1024px) {
    display: grid;
    /* minmax(0,...) tracks SHRINK to fit — never overflow the card at 1024–1440 (fixed px did). */
    grid-template-columns: minmax(0, 460px) minmax(0, 1fr);
    grid-template-areas:
      "decl  proof"
      "nba   proof";
    grid-template-rows: auto 1fr;
    column-gap: 32px;
    padding: 40px;
  }
`;

/* DOM order stays decl → proof → nba (mobile-correct); desktop places via grid-area. */
export const ZoneDecl = styled.div`@media (min-width: 1024px) { grid-area: decl; min-width: 0; }`;
export const ZoneProof = styled.div`@media (min-width: 1024px) { grid-area: proof; align-self: center; min-width: 0; }`;
export const ZoneNba = styled.div`@media (min-width: 1024px) { grid-area: nba; min-width: 0; }`;

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
  color: var(--text-primary-80, rgba(224, 236, 244, 0.8));
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
  ${({ $pr }) => $pr && css`text-shadow: 0 0 18px var(--glow-gold, rgba(198, 168, 75, 0.45));`}
`;

export const GoldPulse = styled.span`
  position: absolute;
  inset: -20% -10%;
  border-radius: 50%;
  background: radial-gradient(circle, var(--glow-gold-strong, rgba(198, 168, 75, 0.5)), transparent 70%);
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
  color: var(--text-primary-85, rgba(224, 236, 244, 0.85));
`;

export const ChartWrap = styled.div`
  position: relative;
  width: 100%;
  min-width: 0;
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
  color: var(--text-primary-75, rgba(224, 236, 244, 0.75));
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
  ${motionSafe(css`
    transition: transform 120ms ease, box-shadow 200ms ease;
    &:active { transform: scale(0.98); }
  `)}
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

/* Primary: Royal Depth bg → Wing Purple glow (Frost White on #003080 ≈ 10:1). swan-guard-allow-hex doc comment contrast note */
export const CtaButton = styled.button`
  ${buttonBase};
  background: var(--surface-elevated, #003080);
  box-shadow: 0 0 24px var(--glow-purple, rgba(139, 92, 246, 0.45));
`;

/* Secondary: deep-violet bg → Ice Wing glow. Deep violet (#5B21B6) keeps the "purple bg → cyan glow" swan-guard-allow-hex doc comment contrast note
   law while clearing 4.5:1 with Frost White (≈7:1); the lighter #8B5CF6 failed at 3.52:1. swan-guard-allow-hex doc comment contrast note
   TOKEN CONTRACT: --glow-accent-strong MUST resolve to a bg that clears 4.5:1 on Frost White.
   Never redefine it as the lighter Wing Purple (#8B5CF6) — that silently regresses contrast below AA. swan-guard-allow-hex doc comment contrast note */
export const ShareButton = styled.button`
  ${buttonBase};
  background: var(--glow-accent-strong, #5B21B6);
  box-shadow: 0 0 24px var(--glow-cyan, rgba(96, 192, 240, 0.45));
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
  color: var(--text-primary-70, rgba(224, 236, 244, 0.7));
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
  color: var(--text-primary-70, rgba(224, 236, 244, 0.7));
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;
