/**
 * ============================================================================
 * FILE: CreatorRenderQueue.styles.ts
 * PURPOSE: Operator console for the render/sync queue. Trust surface, not an awe surface.
 * ============================================================================
 *
 * THE ONE RULE THIS FILE ENCODES: **motion is a guarantee, not decoration.**
 *
 * The endpoint behind this screen used to answer `success: true, status: 'waiting'` while
 * rendering nothing. A spinner on a job that no worker can pick up is that same lie moved
 * to the pixel layer — rotation is a universal claim that work is happening. So there is
 * exactly ONE animated element in this file (`Indeterminate`), it is reachable only from
 * the `rendering` state where the backend has proof of work, and it is disabled under
 * `prefers-reduced-motion` WITHOUT loss of meaning, because tone + glyph + text already
 * carry it. The test: freeze every animation and the UI still tells the truth.
 *
 * COLOUR IS SEMANTIC, NOT MOOD. Blocked states are Gilded Fern (var(--accent-gold, #C6A84B)), never danger
 * red — red says "broken", gold says "unfinished". A first-run console with no worker is
 * not a fault; it is step one of two, and the palette has to say so.
 */

import styled, { css, keyframes } from 'styled-components';

export const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 24px 40px;
  color: var(--text-primary, #E0ECF4);

  @media (max-width: 480px) { padding: 16px 12px 32px; }
`;

/* ── Fleet Strip — the signature moment ───────────────────────────────────────
 * Always mounted, never animated, never softened. It states the raw backend enum
 * verbatim in monospace so an operator reads system truth before reading any card.
 * Quiet, unblinking data honesty is the memorable move on a trust surface. */
export const FleetStrip = styled.div<{ $tone: 'ok' | 'blocked' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  min-height: 56px;
  padding: 12px 20px;
  border-radius: 12px;
  background: var(--surface-dark, #1A1A24);
  border: 1px solid ${(p) => (p.$tone === 'ok' ? 'rgba(96,192,240,0.35)' : 'rgba(198,168,75,0.45)')};
  border-left: 4px solid ${(p) => (p.$tone === 'ok' ? 'var(--accent-primary, #60C0F0)' : 'var(--accent-gold, #C6A84B)')};
`;

export const FleetReadout = styled.code`
  font-family: 'Fira Code', ui-monospace, monospace;
  font-size: 13px;
  letter-spacing: 0.02em;
  /* Arctic Cyan is data-only per the palette rule — a readout is exactly that. */
  color: var(--data-accent, #50A0F0);
  word-break: break-word;
`;

export const FleetLabel = styled.span<{ $tone: 'ok' | 'blocked' }>`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 15px;
  color: ${(p) => (p.$tone === 'ok' ? 'var(--accent-primary, #60C0F0)' : 'var(--accent-gold, #C6A84B)')};
`;

/* ── Layout ──────────────────────────────────────────────────────────────────
 * Left-anchored, never a centered island. At 2560px+ the setup card holds a sane
 * measure on the left while the queue preview takes the remaining canvas, so the
 * monitor is used for information rather than for margin. */
export const Split = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;
  align-items: start;

  @media (min-width: 1280px) { grid-template-columns: minmax(420px, 560px) 1fr; }
  @media (min-width: 2560px) { grid-template-columns: minmax(480px, 640px) 1fr; }
`;

export const Card = styled.div<{ $accent?: 'gold' | 'ice' | 'none' }>`
  background: var(--card-dark, #141419);
  border: 1px solid rgba(224, 236, 244, 0.08);
  border-top: 3px solid ${(p) => (p.$accent === 'gold' ? 'var(--accent-gold, #C6A84B)' : p.$accent === 'ice' ? 'var(--accent-primary, #60C0F0)' : 'transparent')};
  border-radius: 14px;
  padding: 24px;

  @media (max-width: 480px) { padding: 18px 14px; }
`;

export const CardTitle = styled.h3`
  margin: 0 0 6px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const CardHint = styled.p`
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.55;
  color: rgba(224, 236, 244, 0.66);
`;

/* ── Setup steps: turns "nothing works" into "you are on step 1 of 2" ──────── */
export const Steps = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

export const Step = styled.li<{ $state: 'done' | 'current' | 'locked' }>`
  display: flex;
  gap: 14px;
  align-items: flex-start;
  min-height: 44px;
  opacity: ${(p) => (p.$state === 'locked' ? 0.42 : 1)};
`;

export const StepIndex = styled.span<{ $state: 'done' | 'current' | 'locked' }>`
  flex: 0 0 auto;
  width: 28px; height: 28px;
  display: grid; place-items: center;
  border-radius: 50%;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  color: ${(p) => (p.$state === 'locked' ? 'rgba(224,236,244,0.6)' : 'var(--bg-base, #0A0A0F)')};
  background: ${(p) => (p.$state === 'done' ? 'var(--accent-primary, #60C0F0)' : p.$state === 'current' ? 'var(--accent-gold, #C6A84B)' : 'rgba(224,236,244,0.14)')};
`;

export const StepBody = styled.div`
  display: flex; flex-direction: column; gap: 4px;
  strong { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 600; }
  span { font-size: 13px; color: rgba(224, 236, 244, 0.62); line-height: 1.5; }
`;

/* ── Buttons — Dual-Button Glow: blue bg -> purple glow, purple bg -> cyan glow ── */
const buttonBase = css`
  min-height: 44px;
  padding: 0 20px;
  border-radius: 10px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  transition: box-shadow 160ms ease, background 160ms ease, opacity 160ms ease;

  &:disabled { cursor: not-allowed; opacity: 0.45; box-shadow: none; }
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export const PrimaryButton = styled.button`
  ${buttonBase};
  color: var(--text-primary, #E0ECF4);
  background: var(--midnight-sapphire, #002060);
  border: 1px solid rgba(96, 192, 240, 0.35);
  &:hover:not(:disabled) { box-shadow: 0 0 0 1px var(--accent-secondary, #8B5CF6), 0 0 18px rgba(139, 92, 246, 0.45); }
`;

export const AccentButton = styled.button`
  ${buttonBase};
  color: var(--bg-base, #0A0A0F);
  background: var(--accent-secondary, #8B5CF6);
  border: 1px solid rgba(139, 92, 246, 0.6);
  &:hover:not(:disabled) { box-shadow: 0 0 0 1px var(--accent-primary, #60C0F0), 0 0 18px rgba(96, 192, 240, 0.5); }
`;

export const QuietButton = styled.button`
  ${buttonBase};
  color: rgba(224, 236, 244, 0.85);
  background: transparent;
  border: 1px solid rgba(224, 236, 244, 0.22);
  &:hover:not(:disabled) { border-color: rgba(96, 192, 240, 0.6); }
`;

/* ── Form ─────────────────────────────────────────────────────────────────── */
export const Field = styled.label`
  display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px;
  font-size: 13px; font-weight: 600;
  color: rgba(224, 236, 244, 0.8);
`;

export const Input = styled.input`
  min-height: 44px;
  padding: 0 14px;
  border-radius: 10px;
  background: var(--surface-dark, #1A1A24);
  border: 1px solid rgba(224, 236, 244, 0.16);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 14px;

  &::placeholder { color: rgba(224, 236, 244, 0.32); }
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 1px; border-color: var(--accent-primary, #60C0F0); }
`;

/* ── Job rows ─────────────────────────────────────────────────────────────── */
export const JobList = styled.ul`
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 12px;
`;

/**
 * `$blocked` is derived from worker presence, NOT from the status string. A `queued` job
 * with a capable worker online and a `queued` job that nothing can touch share a status
 * and are opposite truths; the dashed border is the instant tell.
 */
export const JobRow = styled.li<{ $blocked: boolean }>`
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--card-dark, #141419);
  border: 1px ${(p) => (p.$blocked ? 'dashed' : 'solid')} ${(p) => (p.$blocked ? 'rgba(198,168,75,0.55)' : 'rgba(224,236,244,0.1)')};
  border-left: 3px solid ${(p) => (p.$blocked ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)')};
`;

export const JobMeta = styled.div`
  display: flex; flex-direction: column; gap: 4px; min-width: 0;
  code { font-family: 'Fira Code', monospace; font-size: 12px; color: rgba(224,236,244,0.55); word-break: break-all; }
`;

/**
 * The status label ALWAYS carries its reason when blocked. The word "Queued" must never
 * appear alone on a job nothing can pick up — the reason suffix is the honesty.
 */
export const StatusLabel = styled.span<{ $tone: 'blocked' | 'ready' | 'working' | 'failed' }>`
  display: inline-flex; align-items: center; gap: 8px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 600;
  color: ${(p) => (
    p.$tone === 'blocked' ? 'var(--accent-gold, #C6A84B)'
      : p.$tone === 'failed' ? 'var(--danger, #E5484D)'
        : 'var(--accent-primary, #60C0F0)')};
`;

/** Two static bars. Deliberately not a circle — circles read as loading. */
export const PauseGlyph = styled.span`
  display: inline-flex; gap: 3px;
  &::before, &::after {
    content: ''; width: 3px; height: 12px; border-radius: 1px; background: currentColor;
  }
`;

export const Dot = styled.span`
  width: 9px; height: 9px; border-radius: 50%; background: currentColor;
`;

const slide = keyframes`
  from { transform: translateX(-100%); }
  to   { transform: translateX(400%); }
`;

/**
 * THE ONLY ANIMATION IN THIS FILE. Reachable exclusively from `rendering`, where the
 * backend has heartbeat evidence that a worker is doing the work. Under reduced motion it
 * freezes into a static bar and loses nothing, because the label already says "Rendering".
 */
export const Indeterminate = styled.div`
  position: relative;
  width: 88px; height: 4px;
  border-radius: 2px;
  overflow: hidden;
  background: rgba(96, 192, 240, 0.18);

  &::after {
    content: '';
    position: absolute; inset: 0 auto 0 0;
    width: 25%;
    background: var(--accent-primary, #60C0F0);
    animation: ${slide} 1.4s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after { animation: none; width: 100%; opacity: 0.5; }
  }
`;

/* ── Ghost preview: teaches what the surface will be without faking that it is ── */
export const GhostRow = styled.div`
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px dashed rgba(224, 236, 244, 0.12);
  background: rgba(20, 20, 25, 0.5);
`;

export const GhostBar = styled.span<{ $w: number }>`
  height: 10px; border-radius: 5px;
  width: ${(p) => p.$w}%;
  background: rgba(224, 236, 244, 0.08);
`;

export const Caption = styled.p`
  margin: 12px 0 0;
  font-size: 13px;
  color: rgba(224, 236, 244, 0.55);
`;

export const ErrorText = styled.p`
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--danger, #E5484D);
`;

/* ── Token modal ──────────────────────────────────────────────────────────── */
export const Scrim = styled.div`
  position: fixed; inset: 0; z-index: 1200;
  display: grid; place-items: center;
  padding: 20px;
  background: rgba(10, 10, 15, 0.9);
`;

export const Modal = styled.div`
  width: min(560px, 100%);
  background: var(--card-dark, #141419);
  border: 1px solid rgba(198, 168, 75, 0.5);
  border-top: 3px solid var(--accent-gold, #C6A84B);
  border-radius: 14px;
  padding: 28px;
  max-height: 90vh; overflow-y: auto;

  @media (max-width: 480px) { padding: 20px 16px; }
`;

/** `user-select: all` so one click-drag grabs the entire credential. */
export const TokenWell = styled.code`
  display: block;
  margin: 16px 0;
  padding: 16px;
  border-radius: 10px;
  background: var(--surface-dark, #1A1A24);
  border: 1px solid var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 16px;
  line-height: 1.5;
  color: var(--text-primary, #E0ECF4);
  user-select: all;
  word-break: break-all;

  @media (max-width: 480px) { font-size: 14px; }
`;

export const Warning = styled.p`
  margin: 0 0 18px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--accent-gold, #C6A84B);
`;

export const ModalActions = styled.div`
  display: flex; gap: 12px; flex-wrap: wrap;
  button { flex: 1 1 160px; }
`;

/**
 * Model attribution, shown beside a finished asset.
 *
 * The licence requires it displayed prominently, so it is legible body text rather than
 * a whispered caption — but it sits under the job id, not competing with status, because
 * the operator's first question is "did it work", not "what made it".
 */
export const Attribution = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary, #A9C2D6);

  span {
    color: var(--accent-gold, #C6A84B);
  }
`;
