import { motion } from 'framer-motion';
import styled from 'styled-components';
import type { SessionBadgeTone } from './SessionAllocationManager.types';

export const ClientsTable = styled.div`
  background: var(--table-bg, rgba(255, 255, 255, 0.03));
  border-radius: 8px;
  overflow: hidden;
`;

export const TableHeader = styled.div`
  background: var(--table-header-bg, rgba(255, 255, 255, 0.1));
  border-bottom: 1px solid var(--border-muted, rgba(255, 255, 255, 0.1));
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 140px;
  padding: 1rem;

  .header-cell {
    color: var(--text-secondary, rgba(224, 236, 244, 0.82));
    font-size: 0.9rem;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

export const TableRow = styled(motion.div)`
  border-bottom: 1px solid var(--border-soft, rgba(255, 255, 255, 0.05));
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 140px;
  padding: 1rem;
  transition: background 0.2s ease;

  &:hover {
    background: var(--row-hover-bg, rgba(255, 255, 255, 0.05));
  }

  .cell {
    align-items: center;
    color: var(--text-primary, #e0ecf4);
    display: flex;
    font-size: 0.9rem;
  }

  .client-info {
    align-items: flex-start;
    flex-direction: column;
  }

  .name {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .email {
    color: var(--text-muted, rgba(224, 236, 244, 0.62));
    font-size: 0.8rem;
  }

  @media (max-width: 768px) {
    border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.08));
    border-radius: 8px;
    gap: 0.5rem;
    grid-template-columns: 1fr;
    margin-bottom: 0.75rem;

    .cell {
      justify-content: space-between;
    }

    .cell::before {
      color: var(--text-secondary, rgba(224, 236, 244, 0.82));
      content: attr(data-label);
      font-weight: 600;
      margin-right: 1rem;
    }
  }
`;

export const SessionBadge = styled.span<{ type: SessionBadgeTone }>`
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;

  background: ${({ type }) => {
    switch (type) {
      case 'good': return 'var(--success-bg, rgba(16, 185, 129, 0.2))';
      case 'low': return 'var(--warning-bg, rgba(245, 158, 11, 0.2))';
      case 'neutral': return 'var(--neutral-bg, rgba(148, 163, 184, 0.16))';
      default: return 'var(--danger-bg, rgba(239, 68, 68, 0.2))';
    }
  }};

  border: 1px solid ${({ type }) => {
    switch (type) {
      case 'good': return 'var(--success-border, rgba(16, 185, 129, 0.3))';
      case 'low': return 'var(--warning-border, rgba(245, 158, 11, 0.3))';
      case 'neutral': return 'var(--neutral-border, rgba(148, 163, 184, 0.24))';
      default: return 'var(--danger-border, rgba(239, 68, 68, 0.3))';
    }
  }};

  color: ${({ type }) => {
    switch (type) {
      case 'good': return 'var(--success, #10b981)';
      case 'low': return 'var(--warning, #f59e0b)';
      case 'neutral': return 'var(--text-muted, #cbd5e1)';
      default: return 'var(--danger, #ef4444)';
    }
  }};
`;

export const SessionSignalText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;

  span {
    color: var(--text-primary, #e0ecf4);
    font-weight: 700;
  }

  small {
    color: var(--text-secondary, rgba(224, 236, 244, 0.68));
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

export const IconButton = styled.button.attrs({ type: 'button' })`
  align-items: center;
  background: var(--accent-primary-bg, rgba(96, 192, 240, 0.2));
  border: none;
  border-radius: 8px;
  color: var(--accent-primary, #60c0f0);
  cursor: pointer;
  display: flex;
  height: 44px;
  justify-content: center;
  transition: all 0.2s ease;
  width: 44px;

  &:hover {
    background: var(--accent-primary-hover-bg, rgba(96, 192, 240, 0.3));
    transform: scale(1.04);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
    transform: none;
  }

  &.success {
    background: var(--success-bg, rgba(16, 185, 129, 0.2));
    color: var(--success, #10b981);
  }
`;

export const EmptyState = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
  padding: 2rem;
  text-align: center;
`;
