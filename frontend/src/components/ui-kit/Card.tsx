/**
 * UI Kit - Card Components
 * =========================
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

// Elevated card
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

// Flex box
export const FlexBox = styled.div<{
  direction?: 'row' | 'column';
  align?: string;
  justify?: string;
  gap?: string;
  wrap?: boolean;
  margin?: string;
  padding?: string;
}>`
  display: flex;
  flex-direction: ${props => props.direction || 'row'};
  align-items: ${props => props.align || 'stretch'};
  justify-content: ${props => props.justify || 'flex-start'};
  gap: ${props => props.gap || '0'};
  ${props => props.wrap && 'flex-wrap: wrap;'}
  ${props => props.margin && `margin: ${props.margin};`}
  ${props => props.padding && `padding: ${props.padding};`}
`;

// Box with padding/margin
export const Box = styled.div<{ padding?: string; margin?: string }>`
  ${props => props.padding && `padding: ${props.padding};`}
  ${props => props.margin && `margin: ${props.margin};`}
`;
