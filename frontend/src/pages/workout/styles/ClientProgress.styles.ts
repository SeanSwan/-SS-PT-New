/**
 * ClientProgress Styles
 * ====================
 * Styled components for the client progress visualization
 */

import styled from 'styled-components';

export const ProgressContainer = styled.div`
  color: white;
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
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
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
  padding: 8px 12px;
  background: rgba(25, 25, 65, 0.6);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  outline: none;
  cursor: pointer;
  font-size: 0.9rem;
  
  &:hover, &:focus {
    border-color: #00ffff;
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
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
    border-color: rgba(0, 255, 255, 0.3);
  }
`;

export const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 5px;
  color: #00ffff;
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
  color: white;
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
  color: white;
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
    color: white;
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
  color: #00ffff;
  font-size: 1.2rem;
`;

export const ErrorMessageContainer = styled.div`
  padding: 20px;
  background: rgba(255, 72, 72, 0.2);
  border: 1px solid rgba(255, 72, 72, 0.3);
  border-radius: 8px;
  color: #ff4848;
  margin-bottom: 20px;
`;
