/**
 * Card Components
 * ===============
 * Container components to replace MUI Card/Paper
 */

import styled from 'styled-components';

// Base card (replaces MUI Paper)
export const Card = styled.div<{ elevated?: boolean; interactive?: boolean }>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  
  ${props => props.elevated && `
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `}
  
  ${props => props.interactive && `
    cursor: pointer;
    
    &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }
    
    &:active {
      transform: translateY(0);
    }
  `}
`;

// Card with more elevation (replaces elevated Paper)
export const ElevatedCard = styled(Card)`
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
`;

// Card header
export const CardHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

// Card body/content
export const CardBody = styled.div<{ padding?: string }>`
  padding: ${props => props.padding || '1.5rem'};
`;

// Card footer
export const CardFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
`;

// Simple panel (minimal card)
export const Panel = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
`;

// Glass card (with blur effect)
export const GlassCard = styled(Card)`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
`;

// Stat card (for displaying metrics)
export const StatCard = styled(Card)`
  text-align: center;
  padding: 1.5rem;
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #3b82f6;
    margin-bottom: 0.5rem;
    line-height: 1;
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .stat-change {
    font-size: 0.75rem;
    margin-top: 0.5rem;
    
    &.positive {
      color: #10b981;
    }
    
    &.negative {
      color: #ef4444;
    }
  }
`;

// Grid container
export const GridContainer = styled.div<{ columns?: number; gap?: string }>`
  display: grid;
  grid-template-columns: repeat(${props => props.columns || 1}, 1fr);
  gap: ${props => props.gap || '1rem'};
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(${props => Math.max(1, (props.columns || 1) - 1)}, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

// Flex container utilities
export const FlexBox = styled.div<{
  direction?: 'row' | 'column';
  align?: string;
  justify?: string;
  gap?: string;
  wrap?: boolean;
}>`
  display: flex;
  flex-direction: ${props => props.direction || 'row'};
  align-items: ${props => props.align || 'stretch'};
  justify-content: ${props => props.justify || 'flex-start'};
  gap: ${props => props.gap || '0'};
  ${props => props.wrap && 'flex-wrap: wrap;'}
`;

// Box with padding
export const Box = styled.div<{ padding?: string; margin?: string }>`
  ${props => props.padding && `padding: ${props.padding};`}
  ${props => props.margin && `margin: ${props.margin};`}
`;
