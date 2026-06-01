/**
 * ClientProgress Styles
 * ====================
 * Styled components for the client progress visualization
 */

import styled from 'styled-components';

export const ProgressContainer = styled.div`
  padding: clamp(1rem, 2vw, 1.5rem);
  background:
    linear-gradient(135deg, rgba(20, 20, 25, 0.96), rgba(0, 32, 96, 0.78)),
    var(--bg-card, #141419);
  border: 1px solid rgba(224, 236, 244, 0.1);
  border-radius: 8px;
  color: var(--text-primary, #e0ecf4);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.36);
`;

export const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
`;

export const Title = styled.h2`
  font-size: 1.8rem;
  color: var(--accent-primary, #60c0f0);
  text-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
  margin: 0;
`;

export const FilterContainer = styled.div`
  display: flex;
  gap: 15px;
  
  @media (max-width: 480px) {
    flex-direction: column;
    width: 100%;
  }
`;

export const FilterSelect = styled.select`
  min-height: 44px;
  padding: 8px 12px;
  background: rgba(25, 25, 65, 0.6);
  color: var(--text-primary, #e0ecf4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  outline: none;
  cursor: pointer;
  font-size: 0.9rem;
  
  &:hover, &:focus {
    border-color: var(--accent-primary, #60c0f0);
    box-shadow: 0 0 5px rgba(139, 92, 246, 0.3);
  }
  
  @media (max-width: 480px) {
    width: 100%;
  }
`;

export const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

export const MetricCard = styled.div`
  background: rgba(25, 25, 65, 0.4);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    border-color: rgba(139, 92, 246, 0.3);
  }
`;

export const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 5px;
  color: var(--accent-primary, #60c0f0);
`;

export const MetricLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

export const ChartSection = styled.div`
  margin-bottom: 40px;
`;

export const ChartTitle = styled.h3`
  font-size: 1.2rem;
  color: var(--text-primary, #e0ecf4);
  margin-bottom: 20px;
  font-weight: 400;
`;

export const ChartContainer = styled.div`
  height: 300px;
  margin-bottom: 30px;
  background: rgba(25, 25, 65, 0.3);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

export const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const NoDataMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
`;

export const SkillLevelCard = styled.div`
  background: rgba(25, 25, 65, 0.4);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

export const SkillLevelTitle = styled.h3`
  font-size: 1.2rem;
  color: var(--text-primary, #e0ecf4);
  margin-bottom: 20px;
  font-weight: 400;
`;

interface SkillBarProps {
  $percentage: number;
  $color: string;
}

export const SkillBar = styled.div<SkillBarProps>`
  height: 10px;
  background: rgba(25, 25, 65, 0.5);
  border-radius: 5px;
  margin-bottom: 15px;
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${props => props.$percentage}%;
    background: ${props => props.$color};
    border-radius: 5px;
    transition: width 1s ease-out;
  }
`;

export const SkillLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  
  span:first-child {
    color: var(--text-primary, #e0ecf4);
  }
  
  span:last-child {
    color: rgba(255, 255, 255, 0.7);
  }
`;

export const LoadingMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: var(--accent-primary, #60c0f0);
  font-size: 1.2rem;
`;

export const ErrorMessageContainer = styled.div`
  padding: 20px;
  background: rgba(255, 72, 72, 0.2);
  border: 1px solid rgba(255, 72, 72, 0.3);
  border-radius: 8px;
  color: var(--danger-text, #ffb4b4);
  margin-bottom: 20px;
`;

export const DataTable = styled.div`
  background: rgba(25, 25, 65, 0.42);
  border: 1px solid rgba(224, 236, 244, 0.1);
  border-radius: 8px;
  padding: clamp(1rem, 2vw, 1.25rem);
  margin-bottom: 1.25rem;
`;

export const TableTitle = styled.h3`
  margin: 0 0 0.95rem;
  color: var(--text-primary, #e0ecf4);
  font-size: 1.05rem;
  font-weight: 700;
`;

export const TableRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.6rem 0;
  border-bottom: 1px solid rgba(224, 236, 244, 0.1);

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }
`;

export const TableLabel = styled.span`
  min-width: 0;
  color: rgba(224, 236, 244, 0.82);
  overflow-wrap: anywhere;
`;

export const TableValue = styled.span`
  color: var(--accent-primary, #60c0f0);
  font-weight: 700;
  white-space: nowrap;
`;
