/**
 * StoreDesignSystem.layout.tsx - Store/Revenue layout primitives.
 * Houses glass cards, KPI blocks, data tables, status badges, and revenue
 * summary UI used by mounted admin order and revenue command surfaces.
 */

import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { fadeIn, STORE_TOKENS } from './StoreDesignSystem.tokens';

export const GlassCard = styled(motion.div)`
  background: ${STORE_TOKENS.bg.glass};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${STORE_TOKENS.border.glass};
  border-radius: ${STORE_TOKENS.radius.card};
  padding: 24px;
  transition: all 300ms cubic-bezier(0.25, 0.8, 0.25, 1);
  animation: ${fadeIn} 0.5s ease-out forwards;

  &:hover {
    transform: translateY(-2px);
    border-color: ${STORE_TOKENS.border.purple};
    box-shadow:
      0 8px 24px color-mix(in srgb, var(--bg-base, #0A0A0F) 42%, transparent),
      0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  }
`;

export const GlassCardStatic = styled.div`
  background: ${STORE_TOKENS.bg.glass};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${STORE_TOKENS.border.glass};
  border-radius: ${STORE_TOKENS.radius.card};
  padding: 24px;
`;

export const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const KPICard = styled.div<{ $accent?: string }>`
  background: ${STORE_TOKENS.bg.glass};
  border: 1px solid ${({ $accent }) => $accent || STORE_TOKENS.border.glass};
  border-radius: ${STORE_TOKENS.radius.card};
  padding: 1.25rem;
  text-align: center;
  transition: all 300ms ease;

  &:hover {
    border-color: ${({ $accent }) => $accent || STORE_TOKENS.border.purple};
    box-shadow: 0 4px 16px color-mix(in srgb, var(--bg-base, #0A0A0F) 34%, transparent);
  }
`;

export const KPIValue = styled.div<{ $color?: string }>`
  font-size: 36px;
  font-weight: 600;
  color: ${({ $color }) => $color || STORE_TOKENS.color.cyan};
  text-shadow: 0 0 20px color-mix(in srgb, ${({ $color }) => $color || STORE_TOKENS.color.cyan} 30%, transparent);
  margin-top: 8px;
  letter-spacing: -1px;
`;

export const KPILabel = styled.div`
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${STORE_TOKENS.color.muted};
  font-weight: 600;
`;

export const DashboardMiddleRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-top: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

export const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: ${STORE_TOKENS.radius.table};
  border: 1px solid ${STORE_TOKENS.border.glass};
  background: ${STORE_TOKENS.bg.dark};
`;

export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
`;

export const Th = styled.th`
  padding: 16px 24px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: ${STORE_TOKENS.color.muted};
  border-bottom: 1px solid ${STORE_TOKENS.border.glass};
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 62%, transparent);
`;

export const Td = styled.td`
  padding: 16px 24px;
  font-size: 14px;
  color: ${STORE_TOKENS.color.white};
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 4%, transparent);
  min-height: 44px;

  @media (max-width: 768px) {
    display: block;
    padding: 8px 16px;
    border: none;

    &::before {
      content: attr(data-label);
      display: block;
      font-size: 11px;
      color: ${STORE_TOKENS.color.muted};
      text-transform: uppercase;
      margin-bottom: 4px;
    }
  }
`;

export const Tr = styled.tr`
  transition: background 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent);
  }

  @media (max-width: 768px) {
    display: block;
    border-bottom: 1px solid ${STORE_TOKENS.border.glass};
    padding: 16px 0;
  }
`;

export const StatusBadge = styled.span<{ $status: 'completed' | 'pending' | 'inactive' | 'active' }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: ${STORE_TOKENS.radius.badge};
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${({ $status }) => {
    switch ($status) {
      case 'completed':
      case 'active':
        return css`
          background: color-mix(in srgb, ${STORE_TOKENS.color.completed} 10%, transparent);
          color: ${STORE_TOKENS.color.completed};
          border: 1px solid color-mix(in srgb, ${STORE_TOKENS.color.completed} 20%, transparent);
        `;
      case 'pending':
        return css`
          background: color-mix(in srgb, ${STORE_TOKENS.color.pending} 10%, transparent);
          color: ${STORE_TOKENS.color.pending};
          border: 1px solid color-mix(in srgb, ${STORE_TOKENS.color.pending} 20%, transparent);
        `;
      case 'inactive':
        return css`
          background: color-mix(in srgb, ${STORE_TOKENS.color.inactive} 10%, transparent);
          color: ${STORE_TOKENS.color.inactive};
          border: 1px solid color-mix(in srgb, ${STORE_TOKENS.color.inactive} 20%, transparent);
        `;
    }
  }}
`;

export const RevenueSummaryBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent) 0%,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent) 100%
  );
  border-radius: ${STORE_TOKENS.radius.table};
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  margin-bottom: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

export const RevenueStat = styled.div`
  text-align: center;
  flex: 1;
`;

export const RevenueStatValue = styled.div<{ $color?: string }>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ $color }) => $color || STORE_TOKENS.color.cyan};
`;

export const RevenueStatLabel = styled.div`
  font-size: 0.7rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 46%, transparent);
  text-transform: uppercase;
  margin-top: 0.25rem;
  letter-spacing: 0.5px;
`;
