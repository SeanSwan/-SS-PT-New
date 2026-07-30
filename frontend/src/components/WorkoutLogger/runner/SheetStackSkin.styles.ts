/**
 * SheetStackSkin.styles — iOS-native sheet ergonomics (SHEET shell).
 * Canvas lists the session; ONE sheet host owns the editor. Detents are
 * tap-toggled (no drag physics v1); max height derives from
 * visualViewport so the keypad never occludes the editor (consult floor).
 * Token-with-fallback only; Train semantics; 44px floors.
 */
import styled from 'styled-components';
import { TRAIN } from '../../../styles/train-tokens';

export const StackShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* Canvas breathes above the peeked sheet + sticky save bar. */
  padding-bottom: 180px;
`;

export const CanvasNow = styled.div`
  border-radius: 14px;
  padding: 14px 16px;
  background: linear-gradient(
    165deg,
    var(--surface-raised, #003080) 0%,
    var(--bg-deep, #0A0A0F) 92%
  );
  border: 1px solid color-mix(in srgb, var(--world-accent, #60C0F0) 30%, transparent);

  small {
    font-family: 'Fira Code', monospace;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${TRAIN.active};
  }
  h3 {
    margin: 4px 0 0;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary, #E0ECF4);
    overflow-wrap: anywhere;
  }
`;

export const CanvasList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const CanvasItem = styled.button<{ $state: 'pending' | 'active' | 'done' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 52px;
  padding: 8px 14px;
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  background: var(--surface-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.12));
  border-left-width: 3px;
  border-left-color: ${({ $state }) =>
    $state === 'done' ? TRAIN.done : $state === 'active' ? TRAIN.active : 'var(--border-subtle, rgba(224, 236, 244, 0.12))'};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.92rem;
  font-weight: 600;

  em {
    font-style: normal;
    font-family: 'Fira Code', monospace;
    font-variant-numeric: tabular-nums;
    font-size: 0.78rem;
    color: ${({ $state }) => ($state === 'done' ? TRAIN.done : TRAIN.pending)};
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

/* ── The single sheet host ────────────────────────────────────── */
export const SheetHost = styled.div<{ $expanded: boolean; $maxHeight: number }>`
  position: fixed;
  left: 8px;
  right: 8px;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 88px);
  z-index: 30;
  display: flex;
  flex-direction: column;
  border-radius: 18px 18px 12px 12px;
  background: color-mix(in srgb, var(--surface-dark, #1A1A24) 96%, transparent);
  border: 1px solid color-mix(in srgb, var(--world-accent, #60C0F0) 28%, transparent);
  box-shadow: 0 -12px 40px color-mix(in srgb, var(--bg-deep, #0A0A0F) 65%, transparent);
  backdrop-filter: blur(14px);
  max-height: ${({ $expanded, $maxHeight }) => ($expanded ? `${$maxHeight}px` : '76px')};
  overflow: hidden;
  transition: max-height 0.28s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
  @media (min-width: 900px) {
    left: auto;
    width: min(560px, 46vw);
  }
`;

export const SheetGrabber = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 76px;
  padding: 8px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-primary, #E0ECF4);

  &::before {
    content: '';
    width: 44px;
    height: 4px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--text-primary, #E0ECF4) 35%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: -2px;
  }
`;

/* Context header stays visible at every detent (consult floor). */
export const SheetContext = styled.span`
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.85rem;

  strong {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.95rem;
  }
  em {
    font-style: normal;
    color: ${TRAIN.active};
  }
`;

export const SheetBody = styled.div`
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 10px calc(env(safe-area-inset-bottom, 0px) + 12px);
`;


