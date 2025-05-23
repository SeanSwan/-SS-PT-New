/**
 * ResponsiveGrid.tsx
 * ================
 * 
 * A highly flexible and accessible responsive grid system component
 * that works seamlessly across all device sizes.
 */

import React from 'react';
import styled from 'styled-components';
import device from '../../styles/breakpoints';

// Grid container types
interface GridContainerProps {
  columns?: { 
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: string;
  rowGap?: string;
  columnGap?: string;
  justifyContent?: 'start' | 'end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
  autoRows?: string;
  minColumnWidth?: string;
  maxWidth?: string;
  fluid?: boolean;
  fullHeight?: boolean;
  children: React.ReactNode;
  className?: string;
  role?: string;
  as?: React.ElementType;
}

// Grid item types
interface GridItemProps {
  colSpan?: { 
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  rowSpan?: number;
  colStart?: number;
  rowStart?: number;
  justifySelf?: 'start' | 'end' | 'center' | 'stretch';
  alignSelf?: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

// Styled grid container
const StyledGridContainer = styled.div<GridContainerProps>`
  display: grid;
  width: 100%;
  box-sizing: border-box;
  max-width: ${props => props.maxWidth || (props.fluid ? '100%' : '1440px')};
  ${props => props.fullHeight && 'height: 100%;'}
  margin: ${props => props.fluid ? '0' : '0 auto'};
  
  /* Handle auto-fit/auto-fill with minColumnWidth */
  ${props => props.minColumnWidth && `
    grid-template-columns: repeat(auto-fill, minmax(${props.minColumnWidth}, 1fr));
  `}
  
  /* Handle explicit column counts at different breakpoints */
  ${props => !props.minColumnWidth && props.columns && `
    grid-template-columns: repeat(${props.columns.xs || 1}, 1fr);
    
    ${device.sm} {
      grid-template-columns: repeat(${props.columns.sm || props.columns.xs || 2}, 1fr);
    }
    
    ${device.md} {
      grid-template-columns: repeat(${props.columns.md || props.columns.sm || props.columns.xs || 3}, 1fr);
    }
    
    ${device.lg} {
      grid-template-columns: repeat(${props.columns.lg || props.columns.md || props.columns.sm || props.columns.xs || 4}, 1fr);
    }
    
    ${device.xl} {
      grid-template-columns: repeat(${props.columns.xl || props.columns.lg || props.columns.md || props.columns.sm || props.columns.xs || 4}, 1fr);
    }
  `}
  
  /* Gap handling */
  gap: ${props => props.gap || '16px'};
  ${props => props.rowGap && `row-gap: ${props.rowGap};`}
  ${props => props.columnGap && `column-gap: ${props.columnGap};`}
  
  /* Auto rows if specified */
  ${props => props.autoRows && `grid-auto-rows: ${props.autoRows};`}
  
  /* Alignment */
  justify-content: ${props => props.justifyContent || 'start'};
  align-items: ${props => props.alignItems || 'stretch'};
  
  /* Mobile optimizations */
  ${device.maxSm} {
    gap: ${props => props.gap ? `calc(${props.gap} * 0.75)` : '12px'};
  }
`;

// Styled grid item
const StyledGridItem = styled.div<GridItemProps>`
  /* Handle column span at different breakpoints */
  ${props => props.colSpan && `
    grid-column: span ${props.colSpan.xs || 1};
    
    ${device.sm} {
      grid-column: span ${props.colSpan.sm || props.colSpan.xs || 1};
    }
    
    ${device.md} {
      grid-column: span ${props.colSpan.md || props.colSpan.sm || props.colSpan.xs || 1};
    }
    
    ${device.lg} {
      grid-column: span ${props.colSpan.lg || props.colSpan.md || props.colSpan.sm || props.colSpan.xs || 1};
    }
    
    ${device.xl} {
      grid-column: span ${props.colSpan.xl || props.colSpan.lg || props.colSpan.md || props.colSpan.sm || props.colSpan.xs || 1};
    }
  `}
  
  /* Row span */
  ${props => props.rowSpan && `grid-row: span ${props.rowSpan};`}
  
  /* Explicit positioning */
  ${props => props.colStart && `grid-column-start: ${props.colStart};`}
  ${props => props.rowStart && `grid-row-start: ${props.rowStart};`}
  
  /* Self alignment */
  ${props => props.justifySelf && `justify-self: ${props.justifySelf};`}
  ${props => props.alignSelf && `align-self: ${props.alignSelf};`}
  
  /* Mobile optimization - all items stack on very small screens */
  ${device.maxXs} {
    grid-column: 1 / -1 !important;
  }
`;

/**
 * ResponsiveGrid - Container component
 */
export const ResponsiveGrid: React.FC<GridContainerProps> = ({ 
  children,
  role = 'grid',
  as = 'div',
  ...props 
}) => {
  return (
    <StyledGridContainer role={role} as={as} {...props}>
      {children}
    </StyledGridContainer>
  );
};

/**
 * GridItem - Item component
 */
export const GridItem: React.FC<GridItemProps> = ({ 
  children,
  as = 'div',
  ...props 
}) => {
  return (
    <StyledGridItem as={as} {...props}>
      {children}
    </StyledGridItem>
  );
};

export default ResponsiveGrid;

/* 
Usage example:

import { ResponsiveGrid, GridItem } from './components/common/ResponsiveGrid';

<ResponsiveGrid 
  columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
  gap="20px"
  alignItems="stretch"
>
  <GridItem colSpan={{ xs: 1, md: 2 }}>
    First item spans 1 column on mobile, 2 on tablet+
  </GridItem>
  <GridItem>
    Standard item
  </GridItem>
  <GridItem>
    Standard item
  </GridItem>
  <GridItem>
    Standard item
  </GridItem>
</ResponsiveGrid>

OR with auto-fill:

<ResponsiveGrid 
  minColumnWidth="280px"
  gap="16px"
>
  <GridItem>Item 1</GridItem>
  <GridItem>Item 2</GridItem>
  <GridItem>Item 3</GridItem>
  <GridItem>Item 4</GridItem>
</ResponsiveGrid>
*/