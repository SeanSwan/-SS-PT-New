import styled, { css } from 'styled-components';
import type { BoardView } from './ClassPreviewPanel.types';

export const BoardToggleBar = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60c0f0) 20%, transparent));
`;

export const BoardTab = styled.button<{ $active: boolean; $board: BoardView }>`
  flex: 1;
  min-height: 44px;
  padding: 8px 16px;
  border: none;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  ${({ $active, $board }) => {
    if ($active && $board === 'main') {
      return css`
        background: var(--accent-primary, #60c0f0);
        color: var(--bg-base, #0A0A0F);
      `;
    }
    if ($active && $board === 'jointFriendly') {
      return css`
        background: var(--accent-gold, #C6A84B);
        color: var(--bg-base, #0A0A0F);
      `;
    }
    if ($active && $board === 'lowImpact') {
      return css`
        background: var(--success, #10B981);
        color: var(--bg-base, #0A0A0F);
      `;
    }
    return css`
      background: transparent;
      color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 65%, transparent));

      &:hover {
        background: color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent);
      }
    `;
  }}

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: -2px;
  }
`;

export const BoardLabel = styled.span<{ $board: BoardView }>`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  margin-left: 6px;
  ${({ $board }) => {
    if ($board === 'jointFriendly') {
      return css`
        background: color-mix(in srgb, var(--accent-gold, #C6A84B) 16%, transparent);
        color: var(--accent-gold, #C6A84B);
      `;
    }
    if ($board === 'lowImpact') {
      return css`
        background: color-mix(in srgb, var(--success, #10B981) 16%, transparent);
        color: var(--success, #10B981);
      `;
    }
    return css`
      background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
      color: var(--text-primary, #E0ECF4);
    `;
  }}
`;

export const TimingBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`;

export const FlowSummary = styled.span`
  margin-left: auto;
  opacity: 0.6;
`;

export const MutedDuration = styled.span`
  opacity: 0.6;
`;

export const StretchSection = styled.div`
  background: color-mix(in srgb, var(--success, #10B981) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--success, #10B981) 18%, transparent);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
`;

export const StretchItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 13px;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 80%, transparent));
`;

export const OverflowItems = styled.div`
  margin-top: 6px;
`;

export const OverflowLap = styled.span`
  margin-right: 8px;
`;

export const SaveAction = styled.div`
  margin-top: 12px;
`;

export const EmptyPanelState = styled.div`
  opacity: 0.5;
  padding: 40px;
  text-align: center;
`;
