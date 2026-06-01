import styled, { css } from 'styled-components';
import { galaxySwanTheme } from '../../../styles/galaxy-swan-theme';

export const LiteCardContainer = styled.div<{ $status: string }>`
  background: rgba(30, 30, 60, 0.4);
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
  min-height: 44px;
`;

export const mobileOptimizations = css`
  /* Disable expensive transforms and shadows on mobile */
  @media (max-width: 768px) {
    transition: none;

    &:hover {
      transform: none;
      box-shadow: none;
    }

    &:active {
      transform: none;
    }
  }
`;

export const CardContainer = styled.div<{ $status: string; $isPast?: boolean; $liteMode?: boolean }>`
  background: ${({ $isPast }) => $isPast ? 'rgba(20, 20, 40, 0.3)' : 'rgba(30, 30, 60, 0.4)'};
  border-radius: 12px;
  border: 1px solid ${({ $isPast }) => $isPast ? 'rgba(255, 255, 255, 0.1)' : 'rgba(139, 92, 246, 0.2)'};
  opacity: ${({ $isPast }) => $isPast ? 0.7 : 1};
  padding: 0.7rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  cursor: pointer;
  transition: ${({ $liteMode }) => $liteMode ? 'none' : 'all 150ms ease-out'};
  position: relative;
  overflow: hidden;
  min-height: 44px; /* Touch target */
  min-width: 0;
  /* NOTE: GPU layer promotion removed - should only be on scroll containers, not individual cards */

  ${({ $status }) =>
    $status === 'blocked' &&
    `
      border-color: rgba(139, 92, 246, 0.5);
      background: rgba(30, 30, 60, 0.25);
      background-image: repeating-linear-gradient(
        45deg,
        rgba(139, 92, 246, 0.25),
        rgba(139, 92, 246, 0.25) 6px,
        rgba(0, 32, 96, 0.2) 6px,
        rgba(0, 32, 96, 0.2) 12px
      );
    `}

  &:hover {
    ${({ $isPast, $liteMode }) => !$isPast && !$liteMode && `
      transform: scale(1.02);
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
    `}
  }

  &:active {
    ${({ $liteMode }) => !$liteMode && `transform: scale(0.98);`}
  }

  &:focus-visible {
    outline: 2px solid ${galaxySwanTheme.primary.main};
    outline-offset: 2px;
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    padding: 0.6rem 0.7rem;
    border-radius: 10px;
    gap: 0.35rem;
    /* Disable transforms on mobile for better scroll */
    transition: none;

    &:hover {
      transform: none;
      box-shadow: none;
    }

    &:active {
      transform: none;
    }
  }

  @media (max-width: 480px) {
    padding: 0.5rem 0.6rem;
    border-radius: 8px;
    gap: 0.3rem;
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;

  @media (max-width: 480px) {
    flex-wrap: wrap;
    row-gap: 0.25rem;
  }
`;

export const StatusDot = styled.span<{ $status: string }>`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ $status }) => {
    switch ($status) {
      case 'confirmed':
        return '#00FF88';
      case 'completed':
        return 'rgba(255, 255, 255, 0.5)';
      case 'cancelled':
        return '#FF4757';
      case 'blocked':
        return galaxySwanTheme.secondary.main;
      default:
        return galaxySwanTheme.primary.main;
    }
  }};
  box-shadow: 0 0 8px currentColor;
`;

export const TimeLabel = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${galaxySwanTheme.text.primary};
  word-break: break-word;

  @media (max-width: 480px) {
    font-size: 0.8rem;
  }
`;

export const DurationLabel = styled.span`
  margin-left: auto;
  font-size: 0.75rem;
  color: ${galaxySwanTheme.text.secondary};
  word-break: break-word;
`;

export const IndicatorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.25rem;
  flex-shrink: 0;
`;

export const Indicator = styled.span<{ $type: 'reminder' | 'feedback' }>`
  font-size: 0.7rem;
  opacity: 0.9;
  cursor: help;
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(1.2);
  }
`;

export const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

export const NameText = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${galaxySwanTheme.text.primary};
  word-break: break-word;

  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

export const MetaText = styled.span`
  font-size: 0.75rem;
  color: ${galaxySwanTheme.text.secondary};
  word-break: break-word;
`;

export const SessionsBadge = styled.span<{ $low: boolean }>`
  position: absolute;
  top: 6px;
  right: 6px;
  background: ${({ $low }) => $low ? 'rgba(255, 71, 87, 0.85)' : 'rgba(139, 92, 246, 0.2)'};
  color: ${({ $low }) => $low ? '#fff' : 'rgba(139, 92, 246, 0.9)'};
  border: 1px solid ${({ $low }) => $low ? 'rgba(255, 71, 87, 0.5)' : 'rgba(139, 92, 246, 0.3)'};
  border-radius: 8px;
  padding: 1px 6px;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1.3;
  min-width: 20px;
  text-align: center;
  z-index: 1;

  @media (max-width: 480px) {
    font-size: 0.6rem;
    padding: 1px 4px;
    top: 4px;
    right: 4px;
  }
`;

export const PackageInfo = styled.span`
  font-size: 0.625rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
