import styled from 'styled-components';
import { motion } from 'framer-motion';

export const StatsBar = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

export const StatCard = styled(motion.div)`
  background: color-mix(in srgb, var(--royal-depth, #003080) 20%, transparent);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  padding: 1.5rem;
  text-align: center;
`;

export const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  margin-bottom: 0.5rem;
`;

export const StatTitle = styled.div`
  font-size: 0.875rem;
  color: var(--text-secondary, #B6C2CC);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const EmptyStateContainer = styled(motion.div)`
  text-align: center;
  padding: 3rem;
  color: var(--text-muted, #9CA8B5);
`;

export const EmptyIconWrap = styled.div`
  margin-bottom: 1rem;
  opacity: 0.5;
`;

export const LoadingShell = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
`;
