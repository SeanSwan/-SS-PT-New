/**
 * Admin sessions search and status filter styles.
 * Uses dashboard theme tokens and preserves 44px touch targets.
 */
import { motion } from 'framer-motion';
import styled from 'styled-components';

const activeFilterGradient = (buttonColor?: string) => {
  if (buttonColor === 'success') return 'linear-gradient(135deg, var(--success, #10b981), #34d399)';
  if (buttonColor === 'error') return 'linear-gradient(135deg, var(--danger, #ef4444), #f87171)';
  return 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))';
};

const filterBorder = (buttonColor?: string) => {
  if (buttonColor === 'success') return 'color-mix(in srgb, var(--success, #10b981) 50%, transparent)';
  if (buttonColor === 'error') return 'color-mix(in srgb, var(--danger, #ef4444) 50%, transparent)';
  return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent)';
};

export const FilterContainer = styled(motion.div)`
  padding: 1.2rem;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 74%, transparent);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

export const SearchField = styled.input`
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  color: var(--text-primary, #E0ECF4);
  padding: 0.5rem 0.75rem;
  font-size: 0.95rem;
  outline: none;
  min-width: 300px;
  min-height: 44px;
  box-sizing: border-box;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.55));
  }

  &:hover,
  &:focus {
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent);
    box-shadow: 0 0 15px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  }

  @media (max-width: 600px) {
    min-width: 100%;
  }
`;

export const FilterButtonsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

export const FilterButton = styled.button<{ $isActive?: boolean; $buttonColor?: string }>`
  border-radius: 10px;
  font-weight: 500;
  padding: 0.35rem 1rem;
  min-width: 100px;
  min-height: 44px;
  letter-spacing: 0.5px;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-size: 0.95rem;
  background: ${({ $isActive, $buttonColor }) => $isActive ? activeFilterGradient($buttonColor) : 'transparent'};
  border: 1px solid ${({ $buttonColor }) => filterBorder($buttonColor)};
  transition: transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease;
  box-shadow: ${({ $isActive }) => $isActive ? '0 4px 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)' : 'none'};

  &:hover {
    background: ${({ $isActive, $buttonColor }) => !$isActive ? `color-mix(in srgb, ${filterBorder($buttonColor)} 20%, transparent)` : undefined};
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;
