/**
 * STYLES: ExerciseCodexMatrix
 * PURPOSE: Dense Rolodex coverage map, status filters, and progress insight panels.
 */
import styled from 'styled-components';
import { swanDataCardShell, swanMetricTile, swanPill } from '../workspaces/clients-team/clientCardSystem';
import type { ExerciseCodexStatus } from './ExerciseCodexMatrix.logic';

const statusFill = (status: ExerciseCodexStatus) => {
  if (status === 'mastered') return 'linear-gradient(135deg, var(--accent-gold, #C6A84B), var(--accent-primary, #60C0F0))';
  if (status === 'trained') return 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))';
  if (status === 'sampled') return 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--chart-focus, #4070C0))';
  return 'var(--bg-surface, #1A1A24)';
};

export const CodexBoard = styled.section`
  --swan-card-padding: 1rem;
  --swan-card-radius: 14px;
  ${swanDataCardShell}
  margin: 0 0 1rem;
  overflow: hidden;

  &:hover {
    transform: none;
  }
`;

export const CodexHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.9rem;
  align-items: start;
  margin-bottom: 0.9rem;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const TitleBlock = styled.div`
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const Title = styled.h4`
  margin: 0.2rem 0 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.05rem;
  overflow-wrap: anywhere;
`;

export const MetaPill = styled.div`
  ${swanPill}
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  color: var(--accent-gold, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 0.76rem;
  font-weight: 900;
`;

export const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.55rem;
  margin-bottom: 0.85rem;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const StatTile = styled.div`
  ${swanMetricTile}
  min-height: 72px;
  display: grid;
  align-content: center;
  gap: 0.25rem;
  padding: 0.7rem 0.75rem;
`;

export const StatValue = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 1.05rem;
  font-weight: 900;
`;

export const StatLabel = styled.span`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const Controls = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto;
  gap: 0.6rem;
  align-items: center;
  margin-bottom: 0.85rem;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const SearchInput = styled.input`
  min-height: 44px;
  width: 100%;
  padding: 0 0.8rem;
  color: var(--text-primary, #E0ECF4);
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent));
  border-radius: 8px;
  font-family: 'Sora', sans-serif;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

export const FilterButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  min-width: 44px;
  padding: 0 0.75rem;
  color: ${({ $active }) => ($active ? 'var(--bg-base, #030712)' : 'var(--text-primary, #E0ECF4)')};
  background: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--bg-surface, #1A1A24)')};
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent));
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.74rem;
  font-weight: 900;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const MatrixShell = styled.div`
  ${swanMetricTile}
  padding: 0.75rem;
  margin-bottom: 0.85rem;
`;

export const MatrixHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
`;

export const MatrixCells = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10px, 1fr));
  gap: 3px;
  max-height: 280px;
  overflow-y: auto;
  scrollbar-color: var(--accent-primary, #60C0F0) transparent;
`;

export const MatrixCell = styled.span<{ $status: ExerciseCodexStatus; $intensity: number }>`
  aspect-ratio: 1;
  min-width: 10px;
  border-radius: 3px;
  background: ${({ $status }) => statusFill($status)};
  opacity: ${({ $status, $intensity }) => ($status === 'untrained' ? 0.58 : Math.max(0.62, $intensity / 100))};
  box-shadow: ${({ $status }) => ($status === 'untrained' ? 'none' : '0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent)')};
`;

export const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 0.75rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const Panel = styled.div`
  ${swanMetricTile}
  min-width: 0;
  padding: 0.75rem;
`;

export const PanelTitle = styled.h5`
  margin: 0 0 0.6rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.82rem;
`;

export const BarList = styled.ul`
  display: grid;
  gap: 0.42rem;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const BarRow = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr) auto;
  gap: 0.45rem;
  align-items: center;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 75%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
`;

export const BarTrack = styled.span`
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--chart-track-bg, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent));
`;

export const BarFill = styled.span<{ $pct: number }>`
  display: block;
  width: ${({ $pct }) => Math.max(3, Math.min(100, $pct))}%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-gold, #C6A84B));
`;

export const PriorityList = styled.ol`
  display: grid;
  gap: 0.45rem;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const PriorityItem = styled.li`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.55rem;
  align-items: center;
  min-height: 44px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.76rem;
`;

export const StatusBadge = styled.span<{ $status: ExerciseCodexStatus }>`
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 999px;
  background: ${({ $status }) => statusFill($status)};
`;

export const MutedText = styled.span`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent));
  font-family: 'Fira Code', monospace;
  font-size: 0.66rem;
  overflow-wrap: anywhere;
`;
