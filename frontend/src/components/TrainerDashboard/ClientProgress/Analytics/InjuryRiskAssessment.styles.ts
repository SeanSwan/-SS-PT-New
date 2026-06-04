import styled from 'styled-components';
import { ChevronDown } from 'lucide-react';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

export const GlassPanel = styled.div`
  padding: 24px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.22));
  border-radius: 12px;
  margin-bottom: 24px;
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-strong, 0 18px 44px rgba(0, 0, 0, 0.36));
`;

export const FlexRow = styled.div`
  display: flex;
  align-items: center;
`;

export const FlexBetween = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const Heading6 = styled.h6`
  margin: 0 0 16px;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const Heading3 = styled.h3<{ $color?: string }>`
  margin: 0 0 8px;
  font-size: 2.5rem;
  font-weight: 700;
  color: ${({ $color }) => $color || 'var(--text-primary, #E0ECF4)'};
`;

export const Subtitle = styled.p`
  margin: 0 0 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const BodyText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-primary, #E0ECF4);
`;

export const SecondaryText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary, #9FB2C8);
`;

export const CaptionText = styled.span`
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary, #9FB2C8);
  display: block;
`;

export const MediumText = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
`;

export const RiskChip = styled.span<{ $bgColor: string }>`
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-on-accent, #0A0A0F);
  background: ${({ $bgColor }) => $bgColor};
  white-space: nowrap;
`;

export const SmallRiskChip = styled(RiskChip)`
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
`;

export const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

export const GridThreeCol = styled(GridContainer)`
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

export const ProgressBarTrack = styled.div`
  width: 100%;
  height: 6px;
  background: var(--surface-muted, rgba(255, 255, 255, 0.1));
  border-radius: 3px;
  overflow: hidden;
`;

export const ProgressBarFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  width: ${({ $width }) => Math.max(0, Math.min(Number.isFinite($width) ? $width : 0, 100))}%;
  background: ${({ $color }) => $color};
  border-radius: 3px;
  transition: width 0.4s ease;
`;

export const AlertBox = styled.div`
  background: color-mix(in srgb, var(--status-error, #FF6B6B) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-error, #FF6B6B) 34%, transparent);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
`;

export const AccordionWrapper = styled.details`
  background: var(--surface-soft, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;

  &[open] > summary svg.chevron-icon {
    transform: rotate(180deg);
  }
`;

export const AccordionSummaryStyled = styled.summary`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  min-height: 44px;
  list-style: none;
  user-select: none;
  color: var(--text-primary, #E0ECF4);

  &::-webkit-details-marker,
  &::marker {
    display: none;
    content: '';
  }
`;

export const AccordionContent = styled.div`
  padding: 0 16px 16px;
  overflow-x: auto;
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

export const TableHead = styled.thead`
  th {
    padding: 8px 12px;
    text-align: left;
    color: var(--text-secondary, #9FB2C8);
    font-weight: 600;
    font-size: 0.8rem;
    border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.22));
    white-space: nowrap;
  }
`;

export const TableBody = styled.tbody`
  td {
    padding: 8px 12px;
    color: var(--text-primary, #E0ECF4);
    border-bottom: 1px solid var(--border-muted, rgba(255, 255, 255, 0.06));
  }
`;

export const ProtocolCard = styled.div<{ $bgColor?: string }>`
  background: ${({ $bgColor }) => $bgColor || 'var(--surface-soft, rgba(255, 255, 255, 0.05))'};
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
  border-radius: 10px;
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

export const ProtocolHeading = styled.h6<{ $color: string }>`
  margin: 0 0 12px;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
`;

export const StyledList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const StyledListItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 0;
  min-height: 36px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
`;

export const ListItemPrimary = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
  display: block;
`;

export const ListItemSecondary = styled.span`
  font-size: 0.75rem;
  color: var(--text-secondary, #9FB2C8);
  display: block;
  margin-top: 2px;
`;

export const RecommendationCard = styled(ProtocolCard)`
  background: var(--surface-soft, rgba(255, 255, 255, 0.05));
`;

export const RecommendationHeading = styled.h6`
  margin: 0 0 12px;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
`;

export const CenterBox = styled.div`
  text-align: center;
`;

export const CategoryBlock = styled.div`
  margin-bottom: 16px;
`;

export const ChevronIcon = styled(ChevronDown)`
  transition: transform 0.2s ease;
  flex-shrink: 0;
  color: var(--text-secondary, #9FB2C8);
`;

export const SummaryLeft = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  gap: 8px;
`;

export const SummaryTitle = styled.span`
  flex: 1;
  font-size: 1rem;
  font-weight: 500;
`;

export const EmptyState = styled.div`
  min-height: 132px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  border: 1px dashed var(--border-soft, rgba(96, 192, 240, 0.22));
  border-radius: 12px;
  background: var(--surface-soft, rgba(255, 255, 255, 0.05));
`;
