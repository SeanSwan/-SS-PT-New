/**
 * Admin sessions metric card styles.
 * Keeps progress-first dashboard statistics visually consistent and under cap.
 */
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { shimmer } from './AdminSessionsTheme.styles';

const variantBackground = (variant?: string) => {
  if (variant === 'primary') return 'linear-gradient(145deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent))';
  if (variant === 'success') return 'linear-gradient(145deg, color-mix(in srgb, var(--success, #10b981) 10%, transparent), color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent))';
  if (variant === 'warning') return 'linear-gradient(145deg, color-mix(in srgb, var(--warning, #f59e0b) 10%, transparent), color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent))';
  return 'linear-gradient(145deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent), color-mix(in srgb, var(--bg-elevated, #141419) 80%, transparent))';
};

const variantBorder = (variant?: string, strength = 30) => {
  if (variant === 'success') return `color-mix(in srgb, var(--success, #10b981) ${strength}%, transparent)`;
  if (variant === 'warning') return `color-mix(in srgb, var(--warning, #f59e0b) ${strength}%, transparent)`;
  if (variant === 'info') return `color-mix(in srgb, var(--accent-primary, #60C0F0) ${Math.max(strength - 6, 18)}%, transparent)`;
  return `color-mix(in srgb, var(--accent-primary, #60C0F0) ${strength}%, transparent)`;
};

export const StatsGridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

export const StatsCard = styled(motion.div)<{ $variant?: string }>`
  border-radius: 15px;
  padding: 1.5rem;
  background: ${({ $variant }) => variantBackground($variant)};
  border: 1px solid ${({ $variant }) => variantBorder($variant)};
  box-shadow: 0 4px 16px color-mix(in srgb, var(--bg-base, #0A0A0F) 28%, transparent);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    transform: translateY(-7px);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--bg-base, #0A0A0F) 36%, transparent);
    border-color: ${({ $variant }) => variantBorder($variant, 48)};
  }
`;

export const StatsIconContainer = styled.div<{ $variant?: string }>`
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  background: ${({ $variant }) => variantBorder($variant, 16)};
  color: ${({ $variant }) => {
    if ($variant === 'success') return 'var(--success, #10b981)';
    if ($variant === 'warning') return 'var(--warning, #f59e0b)';
    return 'var(--accent-primary, #60C0F0)';
  }};
`;

export const StatsValue = styled.h3`
  margin: 0;
  font-size: 2.2rem;
  font-weight: 700;
  background: linear-gradient(to right, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6), var(--accent-gold, #C6A84B), var(--accent-primary, #60C0F0));
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${shimmer} 4s linear infinite;
`;

export const StatsLabel = styled.p`
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
`;
