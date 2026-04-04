/**
 * Styled components for Bootcamp Builder mode bar, timing alert, and layout
 */
import styled from 'styled-components';

export const ModeBar = styled.div`
  display: flex;
  gap: 4px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;

  @media (max-width: 768px) {
    padding: 6px 10px;
    gap: 4px;
  }
`;

export const ModeBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  min-height: 36px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.1))'};
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-muted, rgba(224, 236, 244, 0.5))'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { border-color: var(--accent-secondary, #8B5CF6); }

  @media (max-width: 430px) {
    font-size: 11px;
    padding: 6px 10px;
    min-height: 32px;
  }
`;

export const TimingAlert = styled.div<{ $over: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  margin-left: auto;
  background: ${({ $over }) => $over ? 'rgba(201, 42, 84, 0.1)' : 'rgba(96, 192, 240, 0.06)'};
  color: ${({ $over }) => $over ? '#C92A54' : 'var(--text-muted, rgba(224, 236, 244, 0.5))'};
  border: 1px solid ${({ $over }) => $over ? 'rgba(201, 42, 84, 0.2)' : 'transparent'};

  @media (max-width: 430px) {
    font-size: 10px;
    padding: 4px 10px;
  }
`;

export const FourPane = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr 280px;
  flex: 1;
  overflow: hidden;
  min-height: 0;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
`;
