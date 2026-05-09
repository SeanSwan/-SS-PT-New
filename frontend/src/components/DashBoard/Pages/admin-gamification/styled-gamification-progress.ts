/**
 * Milestone and progress primitives for gamification surfaces.
 * Extracted from styled-gamification-system.ts without runtime behavior changes.
 */

import styled from 'styled-components';

export const MilestoneTrack = styled.div`
  position: relative;
  height: 200px;
  margin: 60px 0;
  padding: 0 50px;
`;

export const MilestoneLine = styled.div`
  position: absolute;
  top: 50%;
  left: 40px;
  right: 40px;
  height: 4px;
  background-color: ${({ theme }) => theme.palette.divider};
  transform: translateY(-50%);
`;

export const MilestoneNode = styled.div<{ active: boolean, passed: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${({ active, passed, theme }) =>
    active ? theme.palette.primary.main :
    passed ? theme.palette.success.main :
    theme.palette.background.paper
  };
  color: ${({ active, passed, theme }) =>
    active || passed ? 'white' : theme.palette.text.secondary
  };
  border: 2px solid ${({ active, passed, theme }) =>
    active ? theme.palette.primary.main :
    passed ? theme.palette.success.main :
    theme.palette.divider
  };
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  box-shadow: ${({ active, passed }) =>
    active || passed ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none'
  };
`;

export const MilestoneLabel = styled.div<{ active: boolean, passed: boolean }>`
  font-size: 14px;
  font-weight: 600;
  margin-top: 16px;
  text-align: center;
  color: ${({ active, passed, theme }) =>
    active ? theme.palette.primary.main :
    passed ? theme.palette.success.main :
    theme.palette.text.primary
  };
`;

export const MilestoneValue = styled.div<{ active: boolean, passed: boolean }>`
  font-size: 14px;
  margin-top: 4px;
  text-align: center;
  color: ${({ active, passed, theme }) =>
    active ? theme.palette.primary.main :
    passed ? theme.palette.success.main :
    theme.palette.text.secondary
  };
`;

// Progress components

export const ProgressContainer = styled.div`
  margin-bottom: 16px;
`;

export const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

export const ProgressTitle = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.palette.text.secondary};
`;

export const ProgressValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.palette.text.primary};
`;

export const StyledProgress = styled.div<{ $percentage: number; $color?: string }>`
  height: 8px;
  background-color: ${({ theme }) => theme.palette.background.default};
  border-radius: 4px;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.$percentage}%;
    background-color: ${props => props.$color || props.theme.palette.primary.main};
    border-radius: 4px;
    transition: width 0.5s ease;
  }
`;
