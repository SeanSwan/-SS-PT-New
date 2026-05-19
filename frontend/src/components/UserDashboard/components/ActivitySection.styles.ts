/**
 * Styled-components for the active UserDashboard V3 activity section.
 */

import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  visionAccentButtonCss,
  visionCardCss,
  visionControlCss,
  visionPanelCss,
} from './UserDashboardSectionChrome.styles';

export const ActivityContainer = styled(motion.div)`
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: visible;
  padding: 2rem;
  ${visionPanelCss}
  color: var(--text-primary, #E0ECF4);

  @media (max-width: 768px) {
    padding: 1.5rem;
  }

  @media (max-width: 480px) {
    padding: 1rem;
  }
`;

export const ActivityHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const ActivityTitle = styled.h2`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-primary, #E0ECF4);
  font-size: 1.75rem;
  font-weight: 700;

  @media (max-width: 768px) {
    justify-content: center;
    font-size: 1.5rem;
  }
`;

export const FilterContainer = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;

  @media (max-width: 1024px) {
    justify-content: flex-start;
  }
`;

export const FilterButton = styled(motion.button)<{ $active?: boolean }>`
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  ${({ $active }) => ($active ? visionAccentButtonCss : visionControlCss)}
  color: ${({ $active }) => ($active ? 'var(--text-inverse, #0F172A)' : 'var(--text-secondary, #94a3b8)')};
  cursor: pointer;
  font-size: 0.875rem;
  white-space: nowrap;
`;

export const StatsOverview = styled.div`
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(160px, 100%), 1fr));
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  @media (max-width: 480px) {
    gap: 0.5rem;
  }

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

export const StatCard = styled(motion.div)`
  padding: 1.5rem;
  ${visionCardCss}
  transition: border-color 0.3s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  }

  @media (max-width: 560px) {
    padding: 1rem;
  }
`;

export const StatIcon = styled.div<{ $color?: string }>`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  border-radius: 8px;
  background: ${({ $color }) => $color || 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-purple, #8B5CF6))'};
  color: var(--button-text, #FFFFFF);
`;

export const StatValue = styled.h3`
  margin: 0 0 0.25rem;
  color: var(--text-primary, #E0ECF4);
  font-size: 1.5rem;
  font-weight: 700;
`;

export const StatLabel = styled.p`
  margin: 0;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.875rem;
  font-weight: 500;
`;

export const ActivityFeed = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const ActivityItem = styled(motion.div)`
  position: relative;
  overflow: hidden;
  padding: 1.25rem;
  ${visionCardCss}
  transition: border-color 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

export const ActivityIcon = styled.div<{ $color?: string }>`
  position: absolute;
  top: 1.25rem;
  left: 1.25rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: ${({ $color }) => $color || 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-purple, #8B5CF6))'};
  color: var(--button-text, #FFFFFF);
`;
