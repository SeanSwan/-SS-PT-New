/**
 * STYLES: ProgressChartWarRoomBoard
 * PURPOSE: Selectable chart board controls and dense stat tiles.
 */
import styled from 'styled-components';
import { swanDataCardShell, swanMetricTile, swanPill } from '../workspaces/clients-team/clientCardSystem';

export const Board = styled.section`
  --swan-card-padding: 1rem;
  --swan-card-radius: 14px;
  ${swanDataCardShell}
  margin: 0 0 1rem;

  &:hover {
    transform: none;
  }
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.9rem;
  margin-bottom: 0.85rem;

  @media (max-width: 720px) {
    flex-direction: column;
  }
`;

export const TitleBlock = styled.div`
  min-width: 0;
`;

export const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
`;

export const Title = styled.h4`
  margin: 0.2rem 0 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.02rem;
  overflow-wrap: anywhere;
`;

export const LayoutPill = styled.div`
  ${swanPill}
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 900;
`;

export const Picker = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.9rem;
`;

export const PickerButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 0 0.75rem;
  color: ${({ $active }) => ($active ? 'var(--bg-base, #030712)' : 'var(--text-primary, #E0ECF4)')};
  background: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--bg-surface, #1A1A24)')};
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 17%, transparent));
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const TileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;

  @media (max-width: 1120px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const Tile = styled.article`
  ${swanMetricTile}
  min-height: 154px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 0.65rem;
  padding: 0.75rem;
  background:
    linear-gradient(150deg, color-mix(in srgb, var(--bg-elevated, #141419) 88%, var(--accent-primary, #60C0F0)), var(--bg-surface, #1A1A24));
`;

export const TileTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.55rem;
`;

export const TileLabel = styled.h5`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.84rem;
  overflow-wrap: anywhere;
`;

export const TileValue = styled.div`
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
  font-size: 1.45rem;
  font-weight: 900;
  line-height: 1;
`;

export const TileDetail = styled.div`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.74rem;
  overflow-wrap: anywhere;
`;

export const TileDepth = styled.div`
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--chart-track-bg, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent));
`;

export const TileDepthFill = styled.span<{ $pct: number }>`
  display: block;
  width: ${({ $pct }) => Math.max(5, Math.min(100, $pct))}%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6), var(--accent-gold, #C6A84B));
`;

export const TileActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
`;

export const IconButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-grid;
  place-items: center;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 82%, transparent);
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent));
  border-radius: 8px;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.52;
  }
`;

export const Empty = styled.div`
  ${swanMetricTile}
  min-height: 100px;
  display: grid;
  place-items: center;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  text-align: center;
`;
