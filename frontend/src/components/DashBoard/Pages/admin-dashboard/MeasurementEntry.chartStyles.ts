/**
 * ============================================================================
 * FILE: MeasurementEntry.chartStyles.ts
 * PURPOSE: Progress chart and hero metric presentation styles.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Owns MeasurementEntry chart shell styling for the progress-at-a-glance
 * section while Victory chart data and rendering remain in the component.
 *
 * HOW IT FITS IN THE APP:
 * MeasurementEntry imports these atoms for its trainer/admin biometrics charts.
 */

import { motion } from 'framer-motion';
import styled from 'styled-components';

export const ProgressGraphSection = styled(motion.div)`
  margin-bottom: 24px;
`;

export const HeroMetricGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
  margin-bottom: 24px;
  @media (min-width: 430px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

export const HeroMetricCard = styled(motion.div)<{ $positive?: boolean }>`
  padding: 20px;
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid ${({ $positive }) =>
    $positive ? 'rgba(76, 175, 80, 0.3)' : 'rgba(139, 92, 246, 0.15)'};
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ $positive }) =>
      $positive
        ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, transparent 60%)'
        : 'linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, transparent 60%)'};
    pointer-events: none;
  }
`;

export const HeroMetricLabel = styled.div`
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;

  @media (max-width: 430px) { font-size: 0.875rem; }
`;

export const HeroMetricValue = styled.div<{ $positive?: boolean }>`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${({ $positive }) => ($positive ? '#4caf50' : '#8B5CF6')};
  line-height: 1.2;

  @media (min-width: 768px) {
    font-size: 2.2rem;
  }
`;

export const HeroMetricUnit = styled.span`
  font-size: 0.85rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.4);
  margin-left: 4px;

  @media (max-width: 430px) { font-size: 0.875rem; }
`;

export const HeroMetricIcon = styled.div<{ $positive?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ $positive }) =>
    $positive ? 'rgba(76, 175, 80, 0.15)' : 'rgba(139, 92, 246, 0.1)'};
  color: ${({ $positive }) => ($positive ? '#4caf50' : '#8B5CF6')};
  margin-bottom: 8px;
`;

export const ChartWrapper3D = styled(motion.div)`
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 20px;
  margin-bottom: 24px;
  perspective: 1200px;

  & > div {
    transform: rotateX(5deg);
    transform-origin: center bottom;
    transition: transform 0.4s ease;
  }

  &:hover > div {
    transform: rotateX(0deg);
  }
`;

export const ChartTitle3D = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: rgba(130, 200, 255, 0.9);
  margin: 0 0 16px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const ChartRow = styled.div`
  display: grid;
  gap: clamp(12px, 3vw, 24px);
  grid-template-columns: 1fr;
  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
`;
