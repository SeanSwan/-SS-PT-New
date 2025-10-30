/**
 * Container Components
 * ====================
 * Reusable layout container components for consistent page structure
 * 
 * Components:
 * - PageContainer: Full-page wrapper with gradient background
 * - ContentContainer: Content width constraint with responsive padding
 * - Section: Semantic section wrapper
 * - FlexContainer: Flex layout utilities
 */

import styled from 'styled-components';

// ==========================================
// THEME CONSTANTS
// ==========================================

export const executiveTheme = {
  deepSpace: '#0a0a0f',
  commandNavy: '#1e3a8a',
  stellarAuthority: '#3b82f6',
  cyberIntelligence: '#0ea5e9',
  executiveAccent: '#0891b2',
  warningAmber: '#f59e0b',
  successGreen: '#10b981',
  criticalRed: '#ef4444',
  stellarWhite: '#ffffff',
  platinumSilver: '#e5e7eb',
  cosmicGray: '#9ca3af',
};

// ==========================================
// PAGE CONTAINER
// ==========================================

export const PageContainer = styled.div<{ variant?: 'default' | 'dark' | 'minimal' }>`
  position: relative;
  overflow-x: hidden;
  background: ${props => {
    switch(props.variant) {
      case 'dark':
        return `linear-gradient(135deg, ${executiveTheme.deepSpace}, ${executiveTheme.commandNavy})`;
      case 'minimal':
        return executiveTheme.deepSpace;
      default:
        return `radial-gradient(ellipse at top, ${executiveTheme.stellarAuthority} 0%, ${executiveTheme.commandNavy} 50%, ${executiveTheme.deepSpace} 100%)`;
    }
  }};
  color: white;
  min-height: 100vh;
`;

// ==========================================
// CONTENT CONTAINER
// ==========================================

export const ContentContainer = styled.div<{ maxWidth?: string }>`
  position: relative;
  z-index: 1;
  padding: 1rem;
  max-width: ${props => props.maxWidth || '100%'};
  margin: 0 auto;
  box-sizing: border-box;
  width: 100%;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }

  @media (min-width: 1024px) {
    padding: 2rem;
  }
`;

// ==========================================
// SECTION WRAPPER
// ==========================================

export const Section = styled.section<{ spacing?: 'sm' | 'md' | 'lg' }>`
  margin-bottom: ${props => {
    switch(props.spacing) {
      case 'sm': return '1rem';
      case 'lg': return '3rem';
      default: return '2rem';
    }
  }};
`;

// ==========================================
// FLEX CONTAINERS
// ==========================================

export const FlexContainer = styled.div<{
  direction?: 'row' | 'column';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  gap?: string;
  wrap?: boolean;
}>`
  display: flex;
  flex-direction: ${props => props.direction || 'row'};
  align-items: ${props => {
    switch(props.align) {
      case 'start': return 'flex-start';
      case 'end': return 'flex-end';
      case 'stretch': return 'stretch';
      default: return 'center';
    }
  }};
  justify-content: ${props => {
    switch(props.justify) {
      case 'start': return 'flex-start';
      case 'end': return 'flex-end';
      case 'between': return 'space-between';
      case 'around': return 'space-around';
      case 'evenly': return 'space-evenly';
      default: return 'center';
    }
  }};
  gap: ${props => props.gap || '1rem'};
  flex-wrap: ${props => props.wrap ? 'wrap' : 'nowrap'};
`;

// ==========================================
// GRID CONTAINER
// ==========================================

export const GridContainer = styled.div<{
  columns?: number;
  minColumnWidth?: string;
  gap?: string;
  responsive?: boolean;
}>`
  display: grid;
  grid-template-columns: ${props => {
    if (props.responsive) {
      return `repeat(auto-fit, minmax(${props.minColumnWidth || '250px'}, 1fr))`;
    }
    return `repeat(${props.columns || 1}, 1fr)`;
  }};
  gap: ${props => props.gap || '1.5rem'};
`;

// ==========================================
// STATS GRID (SPECIALIZED)
// ==========================================

export const StatsGridContainer = styled(GridContainer)`
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

// ==========================================
// FILTER CONTAINER
// ==========================================

export const FilterContainer = styled.div`
  padding: 1.2rem;
  background: rgba(30, 58, 138, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(59, 130, 246, 0.15);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

// ==========================================
// CARD LAYOUT CONTAINERS
// ==========================================

export const CardHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

export const CardContent = styled.div`
  padding: 1.5rem;
`;

// ==========================================
// FOOTER ACTIONS
// ==========================================

export const FooterActionsContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
`;

// ==========================================
// ICON BUTTON CONTAINER
// ==========================================

export const IconButtonContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

export default {
  PageContainer,
  ContentContainer,
  Section,
  FlexContainer,
  GridContainer,
  StatsGridContainer,
  FilterContainer,
  CardHeader,
  CardContent,
  FooterActionsContainer,
  IconButtonContainer,
};
