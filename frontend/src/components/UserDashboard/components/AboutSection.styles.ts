/**
 * Styled-components for the active UserDashboard V3 profile about section.
 */

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import styled from 'styled-components';
import { visionCardCss, visionPanelCss } from './UserDashboardSectionChrome.styles';

export const AboutContainer = styled(motion.div)`
  padding: 2rem;
  ${visionPanelCss}
  color: var(--text-primary, #E0ECF4);

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

export const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

export const InfoCard = styled(motion.div)<{ $spaced?: boolean }>`
  margin-top: ${({ $spaced }) => ($spaced ? '2rem' : 0)};
  padding: 1.5rem;
  ${visionCardCss}
  transition: border-color 0.3s ease, transform 0.3s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
    transform: translateY(-2px);
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

export const CardTitle = styled.h3`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary, #E0ECF4);
  font-size: 1.25rem;
  font-weight: 700;
`;

export const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  transition: background 0.3s ease;

  &:hover {
    background: var(--bg-elevated, rgba(0, 48, 128, 0.85));
  }
`;

export const InfoIcon = styled.div<{ $color?: string }>`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: ${({ $color }) => $color || 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-purple, #8B5CF6))'};
  color: var(--button-text, #FFFFFF);
`;

export const InfoContent = styled.div`
  min-width: 0;
  flex: 1;
`;

export const InfoLabel = styled.p`
  margin: 0 0 0.25rem;
  color: var(--text-muted, #64748b);
  font-size: 0.875rem;
  font-weight: 500;
`;

export const InfoValue = styled.p`
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  font-weight: 600;
`;

export const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem;
  color: var(--text-muted, #64748b);
`;

export const LoadingSpinner = styled(Loader2)`
  animation: about-spin 1s linear infinite;

  @keyframes about-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const EmptyState = styled.div`
  padding: 2rem;
  color: var(--text-muted, #64748b);
  font-size: 0.9rem;
  text-align: center;
`;
