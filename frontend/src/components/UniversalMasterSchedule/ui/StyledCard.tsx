/**
 * Card Components
 * ===============
 * Container components to replace MUI Card/Paper
 */

import styled, { css } from 'styled-components';

const SCHEDULE_CARD_THEME = {
  surface: 'var(--bg-elevated, #141419)',
  surfaceSoft: 'color-mix(in srgb, var(--bg-elevated, #141419) 84%, transparent)',
  surfaceHover: 'color-mix(in srgb, var(--bg-elevated, #141419) 92%, var(--accent-primary, #60C0F0) 8%)',
  panelSurface: 'color-mix(in srgb, var(--bg-surface, #1A1A24) 78%, transparent)',
  glassSurface: 'color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent)',
  borderSoft: 'var(--border-soft, rgba(96, 192, 240, 0.18))',
  borderStrong: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent)',
  accent: 'var(--accent-primary, #60C0F0)',
  textMuted: 'var(--text-muted, rgba(224, 236, 244, 0.65))',
  success: 'var(--success, #10B981)',
  danger: 'var(--danger, #EF4444)',
  shadowSoft: 'var(--shadow-soft, 0 4px 12px rgba(0, 0, 0, 0.24))',
  shadowStrong: 'var(--shadow-strong, 0 8px 24px rgba(0, 0, 0, 0.32))',
} as const;

const elevatedCardStyles = css`
  box-shadow: ${SCHEDULE_CARD_THEME.shadowSoft};
`;

const interactiveCardStyles = css`
  cursor: pointer;

  &:hover {
    background: ${SCHEDULE_CARD_THEME.surfaceHover};
    border-color: ${SCHEDULE_CARD_THEME.borderStrong};
    transform: translateY(-2px);
    box-shadow: ${SCHEDULE_CARD_THEME.shadowStrong};
  }

  &:active {
    transform: translateY(0);
  }
`;

// Base card (replaces MUI Paper)
export const Card = styled.div<{ elevated?: boolean; interactive?: boolean }>`
  background: ${SCHEDULE_CARD_THEME.surfaceSoft};
  border: 1px solid ${SCHEDULE_CARD_THEME.borderSoft};
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  
  ${props => props.elevated && elevatedCardStyles}
  
  ${props => props.interactive && interactiveCardStyles}
`;

// Card with more elevation (replaces elevated Paper)
export const ElevatedCard = styled(Card)`
  background: ${SCHEDULE_CARD_THEME.surface};
  backdrop-filter: blur(10px);
  box-shadow: ${SCHEDULE_CARD_THEME.shadowStrong};
`;

// Card header
export const CardHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${SCHEDULE_CARD_THEME.borderSoft};
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
  border-top: 1px solid ${SCHEDULE_CARD_THEME.borderSoft};
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
`;

// Simple panel (minimal card)
export const Panel = styled.div`
  background: ${SCHEDULE_CARD_THEME.panelSurface};
  border: 1px solid ${SCHEDULE_CARD_THEME.borderSoft};
  border-radius: 8px;
  padding: 1rem;
`;

// Glass card (with blur effect)
export const GlassCard = styled(Card)`
  background: ${SCHEDULE_CARD_THEME.glassSurface};
  backdrop-filter: blur(20px);
  border: 1px solid ${SCHEDULE_CARD_THEME.borderStrong};
`;

// Stat card (for displaying metrics)
export const StatCard = styled(Card)`
  text-align: center;
  padding: 1.5rem;
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: ${SCHEDULE_CARD_THEME.accent};
    margin-bottom: 0.5rem;
    line-height: 1;
  }

  .stat-label {
    font-size: 0.875rem;
    color: ${SCHEDULE_CARD_THEME.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-change {
    font-size: 0.75rem;
    margin-top: 0.5rem;

    &.positive {
      color: ${SCHEDULE_CARD_THEME.success};
    }

    &.negative {
      color: ${SCHEDULE_CARD_THEME.danger};
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
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
`;

// Flex container utilities
const flexBoxStyleProps = new Set(['direction', 'align', 'justify', 'gap', 'wrap']);

export const FlexBox = styled.div.withConfig({
  shouldForwardProp: (prop) => !flexBoxStyleProps.has(prop),
})<{
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
