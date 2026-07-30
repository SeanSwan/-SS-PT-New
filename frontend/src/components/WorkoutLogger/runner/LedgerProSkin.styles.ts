/**
 * LedgerProSkin.styles — the perfected dense table (LEDGER shell).
 * Power-user throughput: column-perfect tabular rhythm, one accent,
 * zero chrome. Rows stay ≥48px (dense tables are where 44px dies —
 * consult floor). Token-with-fallback only; Train semantics.
 */
import styled from 'styled-components';
import { TRAIN } from '../../../styles/train-tokens';

export const LedgerShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const LedgerHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-deep, #0A0A0F) 92%, transparent);
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.14));
  backdrop-filter: blur(8px);
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.85rem;
  color: var(--text-primary, #E0ECF4);

  b { color: ${TRAIN.done}; }
  span { color: var(--text-secondary, rgba(224, 236, 244, 0.62)); }
`;

export const ExerciseBlock = styled.section`
  border-radius: 12px;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.1));
  background: var(--surface-elevated, #141419);
  overflow: hidden;
`;

export const ExerciseRow = styled.header<{ $done: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 4px 12px;
  border-left: 3px solid ${({ $done }) => ($done ? TRAIN.done : TRAIN.active)};

  h4 {
    flex: 1;
    margin: 0;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-primary, #E0ECF4);
    overflow-wrap: anywhere;
  }
`;

export const ExerciseMeta = styled.span<{ $done: boolean }>`
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.78rem;
  color: ${({ $done }) => ($done ? TRAIN.done : TRAIN.pending)};
`;

export const IconAction = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary, rgba(224, 236, 244, 0.62));
  cursor: pointer;

  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const SetList = styled.div`
  display: flex;
  flex-direction: column;
`;

export const SlimAddSet = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  width: 100%;
  border: none;
  border-top: 1px dashed var(--border-subtle, rgba(224, 236, 244, 0.12));
  background: transparent;
  color: ${TRAIN.pending};
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;

  &:hover { color: ${TRAIN.active}; }
  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: -2px;
  }
`;

export const LedgerBottomBar = styled.div`
  position: sticky;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 96px);
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 52px;
  padding: 8px 12px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-deep, #0A0A0F) 88%, transparent);
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.14));
  backdrop-filter: blur(10px);
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary, #E0ECF4);

  b { color: ${TRAIN.done}; }
`;

export const BarButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--world-accent, #60C0F0) 40%, transparent);
  background: transparent;
  color: ${TRAIN.active};
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;
