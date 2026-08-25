/**
 * ============================================================================
 * FILE: AtelierCompose.styles.ts
 * PURPOSE: The Compose ladder — the first CREATION surface in the studio. Still a
 *          trust surface: every price, lane and readiness is server truth.
 * ============================================================================
 *
 * Buttons, fields and the panel shell are IMPORTED from CreatorRenderQueue.styles
 * (Dual-Button Glow, 44px, focus rings) — one implementation, not a drifting copy.
 * Only primitives that do not exist there live here.
 *
 * COLOUR IS SEMANTIC. `unproven` is Gilded Fern — a lane that has never been probed
 * is unfinished, not broken. `off` is muted frost. `ready` is Ice Wing. Danger red
 * is reserved for a still that actually failed.
 *
 * MOTION: none. A candidate grid that fades in is claiming the render is "arriving";
 * the server already told us it arrived. Layout does the work.
 */

import styled, { css } from 'styled-components';

export {
  Panel, Card, CardTitle, CardHint, PrimaryButton, AccentButton, QuietButton, Field, Input,
  Caption, ErrorText,
} from './CreatorRenderQueue.styles';

type Tone = 'ready' | 'unproven' | 'off';
const toneColor = (t: Tone) => (
  t === 'ready' ? 'var(--accent-primary, #60C0F0)'
    : t === 'unproven' ? 'var(--accent-gold, #C6A84B)'
      : 'rgba(224, 236, 244, 0.45)'
);

/* ── Lane strip — server truth, verbatim, before any control ─────────────── */
export const LaneStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
`;

export const LaneCell = styled.div<{ $tone: Tone }>`
  display: flex; flex-direction: column; gap: 6px;
  min-height: 56px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--surface-dark, #1A1A24);
  border: 1px solid rgba(224, 236, 244, 0.12);
  border-left: 4px solid ${(p) => toneColor(p.$tone)};
`;

export const LaneText = styled.span<{ $tone: Tone }>`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600; font-size: 14px;
  color: ${(p) => toneColor(p.$tone)};
`;

export const LaneFix = styled.code`
  font-family: 'Fira Code', ui-monospace, monospace;
  font-size: 12px;
  color: var(--data-accent, #50A0F0);
  word-break: break-word;
`;

/* ── Ladder — Brief ● Still ○ Motion ○ Publish ────────────────────────────── */
export const Ladder = styled.ol`
  list-style: none; margin: 0; padding: 0;
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px 14px;
  font-family: 'Sora', sans-serif; font-size: 13px;
`;

export const Rung = styled.li<{ $state: 'done' | 'current' | 'locked' }>`
  display: inline-flex; align-items: center; gap: 8px;
  color: ${(p) => (p.$state === 'locked' ? 'rgba(224,236,244,0.4)' : 'var(--text-primary, #E0ECF4)')};
  &::before {
    content: '';
    width: 10px; height: 10px; border-radius: 50%;
    background: ${(p) => (p.$state === 'current' ? 'var(--accent-primary, #60C0F0)'
      : p.$state === 'done' ? 'var(--accent-secondary, #8B5CF6)' : 'transparent')};
    border: 2px solid ${(p) => (p.$state === 'locked' ? 'rgba(224,236,244,0.3)' : 'var(--accent-primary, #60C0F0)')};
  }
`;

/* ── Two-column workspace: brief left, candidates right ───────────────────── */
export const Workspace = styled.div`
  display: grid;
  grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
  @media (max-width: 960px) { grid-template-columns: 1fr; }
`;

export const TextArea = styled.textarea`
  min-height: 132px;
  padding: 12px 14px;
  border-radius: 10px;
  resize: vertical;
  background: var(--surface-dark, #1A1A24);
  border: 1px solid rgba(224, 236, 244, 0.16);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif; font-size: 15px; line-height: 1.5;
  &::placeholder { color: rgba(224, 236, 244, 0.32); }
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 1px; border-color: var(--accent-primary, #60C0F0); }
`;

export const Select = styled.select`
  min-height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  background: var(--surface-dark, #1A1A24);
  border: 1px solid rgba(224, 236, 244, 0.16);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace; font-size: 14px;
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 1px; }
`;

/* ── A group of buttons is NOT a label target. `Field` is a <label> and may wrap ONE
 * control; wrapping a segment of buttons makes the label's target ambiguous and nests
 * interactives. Groups get a div + a visible caption instead. ───────────────────── */
export const FieldGroup = styled.div`
  display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px;
`;

export const FieldLabel = styled.span`
  font-size: 13px; font-weight: 600;
  color: rgba(224, 236, 244, 0.8);
`;

/* ── Segmented choice (lane / source / law profile) — real buttons, 44px ──── */
export const Segment = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px;
`;

export const SegmentButton = styled.button<{ $on: boolean }>`
  min-height: 44px; padding: 0 14px;
  border-radius: 10px;
  font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600;
  cursor: pointer;
  color: ${(p) => (p.$on ? 'var(--bg-base, #0A0A0F)' : 'rgba(224,236,244,0.85)')};
  background: ${(p) => (p.$on ? 'var(--accent-primary, #60C0F0)' : 'transparent')};
  border: 1px solid ${(p) => (p.$on ? 'var(--accent-primary, #60C0F0)' : 'rgba(224,236,244,0.22)')};
  &:disabled { cursor: not-allowed; opacity: 0.45; }
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
`;

/* ── Route + cost readout ─────────────────────────────────────────────────── */
export const RouteRow = styled.div`
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(0, 32, 96, 0.35);
  border: 1px solid rgba(96, 192, 240, 0.25);
`;

export const Readout = styled.code`
  font-family: 'Fira Code', ui-monospace, monospace;
  font-size: 13px;
  color: var(--data-accent, #50A0F0);
  font-variant-numeric: tabular-nums;
`;

/* ── Candidate grid ───────────────────────────────────────────────────────── */
export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
`;

export const StillCard = styled.figure<{ $selected: boolean }>`
  margin: 0;
  display: flex; flex-direction: column; gap: 8px;
  padding: 10px;
  border-radius: 12px;
  background: var(--carbon, #141419);
  border: 1px solid ${(p) => (p.$selected ? 'var(--accent-secondary, #8B5CF6)' : 'rgba(224,236,244,0.12)')};
  ${(p) => p.$selected && css`box-shadow: 0 0 0 1px var(--accent-secondary, #8B5CF6), 0 0 18px rgba(139, 92, 246, 0.35);`}
`;

/* The frame takes the aspect the operator ASKED for. A 9:16 candidate forced into a
 * 16:9 box with object-fit: cover is shown as a landscape crop of a portrait image —
 * the operator judges a composition the model never produced. */
const aspectCss = (a?: string) => (a && /^\d{1,2}:\d{1,2}$/.test(a) ? a.replace(':', ' / ') : '16 / 9');

export const StillImage = styled.img<{ $aspect?: string }>`
  width: 100%; aspect-ratio: ${(p) => aspectCss(p.$aspect)}; object-fit: contain;
  border-radius: 8px;
  background: var(--surface-dark, #1A1A24);
`;

export const StillPlaceholder = styled.div<{ $aspect?: string }>`
  width: 100%; aspect-ratio: ${(p) => aspectCss(p.$aspect)};
  display: flex; align-items: center; justify-content: center; text-align: center;
  padding: 12px; border-radius: 8px;
  background: var(--surface-dark, #1A1A24);
  color: rgba(224, 236, 244, 0.6);
  font-family: 'Fira Code', monospace; font-size: 12px; word-break: break-all;
`;

export const StillMeta = styled.figcaption`
  display: flex; flex-wrap: wrap; gap: 6px 12px;
  font-family: 'Fira Code', monospace; font-size: 11.5px;
  color: rgba(224, 236, 244, 0.7);
  font-variant-numeric: tabular-nums;
`;

export const SelectButton = styled.button<{ $on: boolean }>`
  min-height: 44px;
  border-radius: 10px;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 600;
  cursor: pointer;
  color: ${(p) => (p.$on ? 'var(--bg-base, #0A0A0F)' : 'var(--text-primary, #E0ECF4)')};
  background: ${(p) => (p.$on ? 'var(--accent-secondary, #8B5CF6)' : 'var(--midnight-sapphire, #002060)')};
  border: 1px solid rgba(139, 92, 246, 0.5);
  &:hover:not(:disabled) { box-shadow: 0 0 0 1px var(--accent-primary, #60C0F0), 0 0 14px rgba(96, 192, 240, 0.4); }
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export const FailureList = styled.ul`
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 6px;
`;

export const FailureRow = styled.li`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(224, 107, 107, 0.4);
  border-left: 4px solid var(--danger, #E06B6B);
  background: var(--surface-dark, #1A1A24);
  font-family: 'Fira Code', monospace; font-size: 12.5px;
  color: rgba(224, 236, 244, 0.85);
`;

export const Notice = styled.p<{ $tone: Tone }>`
  margin: 0;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(224, 236, 244, 0.12);
  border-left: 4px solid ${(p) => toneColor(p.$tone)};
  background: var(--surface-dark, #1A1A24);
  font-family: 'Sora', sans-serif; font-size: 13.5px; line-height: 1.5;
  color: var(--text-primary, #E0ECF4);
`;
