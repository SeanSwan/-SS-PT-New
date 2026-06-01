import { motion } from 'framer-motion';
import styled from 'styled-components';

export const KPI_SUCCESS = 'var(--success, #10B981)';
export const KPI_INFO = 'var(--accent-tertiary, #4070C0)';
export const KPI_WARNING = 'var(--warning, #F59E0B)';
export const KPI_ERROR = 'var(--error, #EF4444)';
export const KPI_GOLD = 'var(--accent-gold, #C6A84B)';
export const KPI_PRIMARY = 'var(--accent-primary, #60C0F0)';

const TEXT_PRIMARY = 'var(--text-primary, #E0ECF4)';
const TEXT_MUTED = 'var(--text-muted, rgba(224, 236, 244, 0.62))';

export const ErrorState = styled.div`
  align-items: center;
  background: color-mix(in srgb, var(--error, #EF4444) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--error, #EF4444) 35%, transparent);
  border-radius: 10px;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px;
`;

export const RetryInline = styled.button`
  align-items: center;
  background: var(--btn-primary-bg, #002060);
  border: 1px solid var(--accent-secondary, #8B5CF6);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: inline-flex;
  font-weight: 700;
  gap: 6px;
  margin-left: auto;
  min-height: 44px;
  padding: 8px 12px;

  &:hover {
    box-shadow: 0 0 14px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 35%, transparent);
  }
`;

export const Header = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 20px;
`;

export const HeaderLeft = styled.div`
  align-items: center;
  display: flex;
  gap: 10px;
`;

export const Title = styled.h3`
  color: ${TEXT_PRIMARY};
  font-size: 16px;
  font-weight: 700;
  margin: 0;
`;

export const PeriodSelector = styled.div`
  background: color-mix(in srgb, var(--bg-elevated, #141419) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border-radius: 10px;
  display: flex;
  gap: 4px;
  padding: 3px;
`;

export const PeriodBtn = styled.button<{ $active: boolean }>`
  background: ${p => p.$active ? `color-mix(in srgb, ${KPI_GOLD} 20%, transparent)` : 'transparent'};
  border: none;
  border-radius: 8px;
  color: ${p => p.$active ? KPI_GOLD : TEXT_MUTED};
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  min-height: 44px;
  padding: 6px 14px;
  transition: all 0.15s;

  &:hover {
    color: ${KPI_GOLD};
  }
`;

export const KPIGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 16px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const KPICard = styled(motion.div)<{ $color: string }>`
  align-items: flex-start;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 72%, transparent);
  border: 1px solid color-mix(in srgb, ${p => p.$color} 22%, transparent);
  border-radius: 12px;
  display: flex;
  gap: 12px;
  padding: 16px;
  transition: border-color 0.2s;

  &:hover {
    border-color: color-mix(in srgb, ${p => p.$color} 44%, transparent);
  }
`;

export const KPIIcon = styled.div<{ $color: string }>`
  align-items: center;
  background: color-mix(in srgb, ${p => p.$color} 10%, transparent);
  border-radius: 10px;
  color: ${p => p.$color};
  display: flex;
  flex-shrink: 0;
  height: 36px;
  justify-content: center;
  width: 36px;
`;

export const KPIContent = styled.div`
  flex: 1;
  min-width: 0;
`;

export const KPILabel = styled.div`
  color: ${TEXT_MUTED};
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

export const KPIValue = styled.div`
  color: ${TEXT_PRIMARY};
  font-family: 'Fira Code', monospace;
  font-size: clamp(18px, 4vw, 22px);
  font-weight: 700;
  margin-top: 2px;
`;

export const KPIChange = styled.div<{ $positive: boolean }>`
  align-items: center;
  color: ${p => p.$positive ? KPI_SUCCESS : KPI_ERROR};
  display: inline-flex;
  font-size: 11px;
  font-weight: 600;
  gap: 2px;
  margin-top: 4px;
`;

export const Sparkline = styled.div`
  align-self: center;
  flex-shrink: 0;
  height: 24px;
  width: 60px;

  svg {
    height: 100%;
    width: 100%;
  }

  @media (max-width: 430px) {
    display: none;
  }
`;

export const BreakdownRow = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, 1fr);

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const BreakdownCard = styled.div`
  background: color-mix(in srgb, ${KPI_GOLD} 5%, transparent);
  border: 1px solid color-mix(in srgb, ${KPI_GOLD} 10%, transparent);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
`;

export const BreakdownLabel = styled.div`
  color: ${TEXT_MUTED};
  font-size: 11px;
`;

export const BreakdownValue = styled.div<{ $positive?: boolean }>`
  color: ${p => p.$positive === undefined ? KPI_GOLD : p.$positive ? KPI_SUCCESS : KPI_ERROR};
  font-family: 'Fira Code', monospace;
  font-size: 18px;
  font-weight: 700;
  margin-top: 4px;
`;
