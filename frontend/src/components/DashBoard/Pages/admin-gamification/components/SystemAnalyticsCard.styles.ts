/**
 * Card, chart, list, and table styles for SystemAnalytics sections.
 */

import styled from 'styled-components';

const analyticsTheme = {
  bg: 'var(--analytics-card-bg, rgba(15, 23, 42, 0.86))',
  bgDefault: 'var(--analytics-bg-default, rgba(10, 15, 30, 0.8))',
  border: 'var(--analytics-border, rgba(96, 192, 240, 0.18))',
  hoverBg: 'var(--analytics-hover-bg, rgba(96, 192, 240, 0.08))',
  text: 'var(--analytics-text, #E0ECF4)',
  textSecondary: 'var(--analytics-text-secondary, #94a3b8)',
  accent: 'var(--analytics-accent, #60C0F0)',
  success: 'var(--analytics-success, #4caf50)',
  error: 'var(--analytics-error, #f44336)',
};

export const GridContainer = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const GridFull = styled.div`
  grid-column: 1 / -1;
`;

export const Grid4Col = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;

  @media (min-width: 430px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

export const GlassCard = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${analyticsTheme.border};
  border-radius: 8px;
  background: ${analyticsTheme.bg};
  backdrop-filter: blur(12px);
`;

export const CardHeaderStyled = styled.div`
  padding: 16px 20px 8px;
  color: ${analyticsTheme.text};
  font-size: 1.1rem;
  font-weight: 700;
`;

export const CardBody = styled.div`
  flex: 1;
  padding: 16px 20px 20px;
`;

export const GlassPaper = styled.div`
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid ${analyticsTheme.border};
  border-radius: 8px;
  background: ${analyticsTheme.bgDefault};
`;

export const SubText = styled.span`
  color: ${analyticsTheme.textSecondary};
  font-size: 0.85rem;
`;

export const SmallText = styled.span`
  color: ${analyticsTheme.textSecondary};
  font-size: 0.8rem;
`;

export const BoldText = styled.span`
  color: ${analyticsTheme.text};
  font-weight: 700;
`;

export const BigValue = styled.div`
  color: ${analyticsTheme.text};
  font-size: 2rem;
  font-weight: 800;
`;

export const SubTitle = styled.div`
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  color: ${analyticsTheme.text};
  font-size: 0.95rem;
  font-weight: 700;
`;

export const PlaceholderText = styled.p`
  margin: 0;
  padding: 16px;
  color: ${analyticsTheme.textSecondary};
  font-size: 0.95rem;
  line-height: 1.5;
  text-align: center;
`;

export const ChipBadge = styled.span`
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--analytics-chip-bg, rgba(96, 192, 240, 0.14));
  color: ${analyticsTheme.accent};
  font-size: 0.75rem;
  font-weight: 700;
`;

export const HrDivider = styled.hr`
  margin: 16px 0;
  border: 0;
  border-top: 1px solid ${analyticsTheme.border};
`;

export const ListContainer = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const ListRow = styled.li`
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid ${analyticsTheme.border};

  &:last-child {
    border-bottom: 0;
  }
`;

export const ListIcon = styled.span`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--analytics-icon-bg, rgba(96, 192, 240, 0.12));
  color: ${analyticsTheme.accent};
`;

export const ListContent = styled.div`
  min-width: 0;
`;

export const ListPrimary = styled.div`
  color: ${analyticsTheme.text};
  font-size: 0.9rem;
  font-weight: 700;
`;

export const ListSecondary = styled.div`
  color: ${analyticsTheme.textSecondary};
  font-size: 0.82rem;
  line-height: 1.45;
`;

export const StyledTableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
`;

export const StyledTable = styled.table`
  width: 100%;
  min-width: 620px;
  border-collapse: collapse;
`;

export const StyledTh = styled.th`
  padding: 10px 12px;
  color: ${analyticsTheme.textSecondary};
  font-size: 0.78rem;
  text-align: left;
`;

export const StyledTd = styled.td`
  padding: 12px;
  border-top: 1px solid ${analyticsTheme.border};
  color: ${analyticsTheme.text};
  font-size: 0.85rem;
`;

export const StyledTr = styled.tr`
  &:hover {
    background: ${analyticsTheme.hoverBg};
  }
`;

export const IconBadge = styled.span<{ $color?: string }>`
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: ${({ $color }) => $color || 'var(--analytics-icon-badge-bg, rgba(96, 192, 240, 0.16))'};
  color: var(--analytics-icon-badge-text, #ffffff);
`;

export const StatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const StatLabel = styled.h3`
  margin: 0;
  color: ${analyticsTheme.textSecondary};
  font-size: 0.82rem;
  font-weight: 700;
`;

export const TrendRow = styled.div`
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const TrendText = styled(SmallText)<{ $trend?: string }>`
  color: ${({ $trend }) => ($trend === 'up' ? analyticsTheme.success : $trend === 'down' ? analyticsTheme.error : analyticsTheme.textSecondary)};
`;
