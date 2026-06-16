/**
 * Queue and summary styles for the embedded Coach intake workspace.
 * Split from CoachIntakeWorkspace.styles.ts to keep files under the 300-line cap.
 */
import styled from 'styled-components';

export const StatGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 124px), 1fr));
  gap: 8px;
  margin: 0;
`;

export const Stat = styled.div`
  min-height: 64px;
  padding: 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #030712) 48%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);

  dt {
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent);
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    text-transform: uppercase;
  }

  dd {
    margin: 4px 0 0;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 24px;
    font-weight: 800;
    color: var(--accent-primary, #60C0F0);
  }
`;

export const ItemList = styled.div`
  display: grid;
  gap: 8px;
  min-width: 0;
`;

export const ItemCard = styled.div<{ $active?: boolean }>`
  min-height: 54px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(190px, 0.82fr);
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #030712) 44%, transparent);
  border: 1px solid ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 55%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)'};
  box-shadow: ${({ $active }) => $active
    ? '0 0 18px color-mix(in srgb, var(--accent-gold, #C6A84B) 16%, transparent)'
    : 'none'};

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }

  > [aria-label='Hold reason preview'],
  > [aria-label^='Audio puzzle'] {
    grid-column: 1 / -1;
  }

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const ItemTitle = styled.div`
  min-width: 0;
  font-family: 'Sora', sans-serif;
  font-size: 12px;

  strong {
    display: block;
    margin-bottom: 3px;
    overflow: hidden;
    text-overflow: clip;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  span {
    display: block;
    overflow-wrap: anywhere;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
  }
`;

export const ChipColumn = styled.div`
  display: grid;
  gap: 8px;
  justify-items: end;
  min-width: 0;

  > * {
    min-width: 0;
  }

  @media (max-width: 860px) {
    justify-items: stretch;
  }
`;

export const QueueMetaChips = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;

  @media (max-width: 860px) {
    justify-content: flex-start;
  }
`;

export const QueueActions = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 132px), 1fr));
  min-width: min(100%, 310px);
  width: min(100%, 420px);

  > * {
    min-width: 0;
  }

  @media (max-width: 860px) {
    width: 100%;
  }
`;

export const SourceChip = styled.span<{ $tone?: 'cyan' | 'gold' | 'purple' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 0 8px;
  border-radius: 999px;
  background: ${({ $tone }) => {
    if ($tone === 'gold') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent)';
    if ($tone === 'purple') return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)';
  }};
  border: 1px solid ${({ $tone }) => {
    if ($tone === 'gold') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 25%, transparent)';
    if ($tone === 'purple') return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)';
  }};
  color: ${({ $tone }) => {
    if ($tone === 'gold') return 'var(--accent-gold, #C6A84B)';
    if ($tone === 'purple') return 'var(--accent-secondary, #8B5CF6)';
    return 'var(--accent-primary, #60C0F0)';
  }};
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  line-height: 1.25;
  max-width: 100%;
  overflow-wrap: anywhere;
`;
