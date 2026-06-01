import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  ChipContainer,
  StyledTableCell,
  StyledTableHeadCell
} from '../admin-sessions/styled-admin-sessions';

export const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 1rem;
  flex-wrap: wrap;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
`;

export const PaginationSelect = styled.select`
  background: rgba(20, 20, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
  outline: none;
  min-height: 36px;
  cursor: pointer;

  option {
    background: var(--bg-base, #0A0A0F);
    color: var(--text-primary, #E0ECF4);
  }
`;

export const PaginationButton = styled.button<{ $disabled?: boolean }>`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: ${p => p.$disabled ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.7)'};
  cursor: ${p => p.$disabled ? 'default' : 'pointer'};
  min-width: 36px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  pointer-events: ${p => p.$disabled ? 'none' : 'auto'};

  &:hover {
    background: rgba(14, 165, 233, 0.1);
    border-color: rgba(14, 165, 233, 0.3);
  }
`;

export const ThemeDot = styled.div<{ $theme?: string }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${p =>
    p.$theme === 'cosmic' ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))' :
    p.$theme === 'purple' ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))' :
    p.$theme === 'ruby' ? 'linear-gradient(135deg, var(--danger, #ef4444), var(--accent-secondary, #8B5CF6))' :
    p.$theme === 'emerald' ? 'linear-gradient(135deg, var(--success, #10b981), var(--accent-primary, #60C0F0))' :
    'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))'
  };
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-inverse, #0A0A0F);
  font-size: 0.75rem;
  font-weight: bold;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
`;

export const RowOpacityWrapper = styled(motion.tr)<{ $dimmed?: boolean }>`
  opacity: ${p => p.$dimmed ? 0.6 : 1};
`;

export const PackagesTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const RightAlignedHeadCell = styled(StyledTableHeadCell)`
  text-align: right;
`;

export const RightAlignedCell = styled(StyledTableCell)`
  text-align: right;
`;

export const CapitalizedChip = styled(ChipContainer)`
  text-transform: capitalize;
`;
