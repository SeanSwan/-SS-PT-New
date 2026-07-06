/**
 * BootcampTaughtPanel.styles
 * ==========================
 * Slice 0.2: purple terminal "Mark as Taught" action + recently-taught
 * history strip. Dual-Button Glow discipline: purple background → cyan
 * (Ice Wing) glow. Mobile-first at 320px; rows keep 44px touch height.
 */

import styled from 'styled-components';

export const TaughtSection = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const MarkTaughtButton = styled.button<{ $floorMode?: boolean }>`
  width: 100%;
  min-height: ${({ $floorMode }) => ($floorMode ? '64px' : '44px')};
  padding: 12px 20px;
  background: var(--accent-secondary, #8b5cf6);
  border: none;
  border-radius: 8px;
  color: var(--text-primary, #e0ecf4);
  font-weight: 600;
  font-size: ${({ $floorMode }) => ($floorMode ? '18px' : '14px')};
  cursor: pointer;
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60c0f0) 35%, transparent);

  &:hover:not(:disabled) {
    box-shadow: 0 0 26px color-mix(in srgb, var(--accent-primary, #60c0f0) 55%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const TaughtConfirmed = styled.div`
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 30%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60c0f0) 8%, transparent);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text-primary, #e0ecf4);
  font-size: 13px;
`;

export const HistoryTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary, #9fb6c8);
`;

export const HistoryList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const HistoryRow = styled.li`
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--surface-elevated, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 12%, transparent);
  color: var(--text-primary, #e0ecf4);
  font-size: 13px;
`;

export const HistoryMeta = styled.span`
  color: var(--text-secondary, #9fb6c8);
  font-size: 12px;
`;

export const HistoryStatus = styled.div`
  color: var(--text-secondary, #9fb6c8);
  font-size: 13px;
  padding: 6px 2px;
`;
