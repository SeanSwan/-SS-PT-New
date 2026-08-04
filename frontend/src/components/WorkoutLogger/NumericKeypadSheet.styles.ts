/**
 * NumericKeypadSheet.styles (Arc L / L2 — Kimi-binding face spec)
 * Glass keys with 8px GAPS (no hairline grid), Fira Code display digits, pressed state =
 * accent color-mix + scale 0.97 (reduced-motion: color only), Done = Dual-Button Glow primary
 * (blue bg → purple glow), safe-area-inset-bottom, landscape max-height 70dvh + internal scroll.
 * Tokens with Crystalline fallbacks only — the sheet rides the Swan Lens.
 */
import styled from 'styled-components';

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(3, 7, 18, 0.55);
`;

export const Sheet = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 91;
  max-height: 70dvh;
  overflow-y: auto;
  padding: 10px 16px calc(14px + env(safe-area-inset-bottom, 0px));
  border-radius: 18px 18px 0 0;
  background: var(--surface-dark, #1A1A24);
  border-top: 1px solid var(--handoff-card-border, rgba(96, 192, 240, 0.16));
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.5);
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: -2px; }
  @media (min-width: 560px) {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    width: 420px;
    border-radius: 18px 18px 0 0;
  }
`;

export const Handle = styled.div`
  width: 44px;
  height: 4px;
  margin: 0 auto 8px;
  border-radius: 999px;
  background: var(--handoff-card-border, rgba(96, 192, 240, 0.25));
`;

export const SheetTitle = styled.p`
  margin: 0 0 4px;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary, #8aa2b8);
`;

export const Display = styled.div`
  min-height: 52px;
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 2rem;
  color: var(--text-primary, #E0ECF4);
  .ghosted { opacity: 0.35; }
`;

export const QuickChip = styled.button`
  min-height: 44px;
  margin-bottom: 8px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px dashed var(--accent-primary, #60C0F0);
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const KeyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px; /* Kimi: gaps, not hairlines */
`;

export const Key = styled.button`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid var(--handoff-card-border, rgba(96, 192, 240, 0.12));
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 4%, transparent); /* glass */
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 1.25rem;
  cursor: pointer;
  transition: background 120ms ease, transform 120ms ease;
  &:active {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
    transform: scale(0.97);
  }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { &:active { transform: none; } }
`;

/* Done = Dual-Button Glow primary: blue bg → purple glow (the law, quoted). */
export const DoneKey = styled(Key)`
  grid-column: span 2;
  background: var(--btn-primary-bg, #002060);
  border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  font-family: 'Sora', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  box-shadow: 0 0 18px var(--glow-purple, rgba(139, 92, 246, 0.4));
  &:active { background: var(--btn-primary-bg, #002060); }
`;

export const FooterRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 8px;
`;

export const SystemKeyboardBtn = styled.button`
  min-height: 44px;
  padding: 0 14px;
  border: none;
  background: transparent;
  color: var(--text-secondary, #8aa2b8);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  text-decoration: underline;
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

/** Batch 4: plate-per-side breakdown of the live weight entry. */
export const PlateHint = styled.div`
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.8rem;
  text-align: center;
  color: var(--world-accent, #60c0f0);
  padding-bottom: 4px;
`;
