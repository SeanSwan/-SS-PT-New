/**
 * Styled-components for the active UserDashboard V3 workout-usage panel.
 */

import styled from 'styled-components';
import {
  visionAccentButtonCss,
  visionCardCss,
  visionControlCss,
  visionPanelCss,
} from './UserDashboardSectionChrome.styles';

export const Container = styled.div`
  ${visionPanelCss}
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: clamp(1rem, 1.5vw, 1.4rem);
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
`;

export const SectionTitle = styled.h3`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
`;

export const LogButton = styled.button`
  ${visionAccentButtonCss}
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  cursor: pointer;
`;

export const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const StatCard = styled.div`
  ${visionCardCss}
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px;
`;

export const StatIcon = styled.div`
  color: var(--accent-primary, #60C0F0);
`;

export const StatValue = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 1.3rem;
  font-weight: 700;
`;

export const StatLabel = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

export const CategorySection = styled.div`
  ${visionCardCss}
  overflow: hidden;
`;

export const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.06);
`;

export const CategoryIcon = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 700;
`;

export const CategoryName = styled.span`
  flex: 1;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 1.5px;
`;

export const CategoryCount = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
`;

export const ChartScroll = styled.div`
  max-height: 180px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-color: rgba(96, 192, 240, 0.2) transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 2px;
    background: rgba(96, 192, 240, 0.2);
  }
`;

export const ChartContainer = styled.div`
  width: 100%;

  svg {
    overflow: visible;
  }
`;

export const ErrorCard = styled.div`
  ${visionCardCss}
  padding: 16px 20px;
  border-left: 4px solid var(--error, #C92A54);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;

  p {
    margin: 0 0 12px;
  }
`;

export const RetryButton = styled.button`
  ${visionControlCss}
  padding: 8px 16px;
  cursor: pointer;
`;
