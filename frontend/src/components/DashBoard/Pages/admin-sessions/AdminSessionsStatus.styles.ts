/**
 * Admin sessions status chips, icon actions, loading, and empty states.
 * Shared by sessions and package administration surfaces.
 */
import { motion } from 'framer-motion';
import styled from 'styled-components';

const statusTone = (status?: string) => {
  if (status === 'completed') return 'var(--success, #10b981)';
  if (status === 'cancelled') return 'var(--danger, #ef4444)';
  if (status === 'confirmed') return '#0891b2';
  if (status === 'available') return '#0ea5e9';
  return '#3b82f6';
};

const actionTone = (color?: string) => {
  if (color === 'primary') return '#0073ff';
  if (color === 'success') return '#00bf8f';
  if (color === 'error') return '#ff416c';
  return 'var(--accent-primary, #60C0F0)';
};

export const ChipContainer = styled.div<{ $chipStatus?: string; chipstatus?: string }>`
  --chip-tone: ${({ $chipStatus, chipstatus }) => statusTone($chipStatus || chipstatus)};
  background: color-mix(in srgb, var(--chip-tone) 15%, transparent);
  color: var(--chip-tone);
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.3rem 0.7rem;
  display: inline-block;
  text-transform: capitalize;
  border: 1px solid color-mix(in srgb, var(--chip-tone) 30%, transparent);
`;

export const IconButtonContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

export const StyledIconButton = styled(motion.button)<{ $btnColor?: string; btncolor?: string }>`
  --action-tone: ${({ $btnColor, btncolor }) => actionTone($btnColor || btncolor)};
  background: color-mix(in srgb, var(--action-tone) 10%, transparent);
  color: var(--action-tone);
  border: none;
  border-radius: 8px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.3s ease, background 0.3s ease;

  &:hover {
    background: color-mix(in srgb, var(--action-tone) 20%, transparent);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const FooterActionsContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
`;

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`;

export const LoadingSpinner = styled.div`
  border: 4px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  border-radius: 50%;
  border-top: 4px solid var(--accent-primary, #60C0F0);
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export const EmptyStateContainer = styled.div`
  text-align: center;
  padding: 3rem 1rem;
`;

export const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 20%, transparent);
`;

export const EmptyStateText = styled.p`
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  font-size: 1.1rem;
`;
