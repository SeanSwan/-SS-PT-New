/**
 * Styled-components for the active UserDashboard V3 workout-usage panel.
 */

import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
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
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent-purple, #8B5CF6), var(--accent-primary, #60C0F0));
  color: var(--button-text, #FFFFFF);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px;
  border: 1px solid rgba(96, 192, 240, 0.12);
  border-radius: 8px;
  background: var(--bg-elevated, rgba(20, 20, 25, 0.8));
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
  overflow: hidden;
  border: 1px solid rgba(96, 192, 240, 0.08);
  border-radius: 8px;
  background: var(--bg-elevated, rgba(20, 20, 25, 0.7));
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
  padding: 16px 20px;
  border-left: 4px solid var(--error, #C92A54);
  border-radius: 8px;
  background: rgba(26, 26, 36, 0.95);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;

  p {
    margin: 0 0 12px;
  }
`;

export const RetryButton = styled.button`
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid rgba(96, 192, 240, 0.3);
  border-radius: 8px;
  background: rgba(96, 192, 240, 0.1);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font-family: 'Sora', sans-serif;

  &:hover {
    background: rgba(96, 192, 240, 0.2);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }
`;
