/**
 * EnhancedWorkoutLogger Styles
 * ============================
 *
 * Keeps the canonical admin/trainer workout logger component under the
 * project line cap while preserving its existing dark-first layout.
 */
import { motion } from 'framer-motion';
import styled from 'styled-components';

export const WorkoutContainer = styled(motion.div)`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
  min-height: 100vh;
  background: linear-gradient(135deg,
    rgba(var(--obsidian-black-rgb, 10, 10, 15), 0.95) 0%,
    rgba(var(--wing-purple-rgb, 139, 92, 246), 0.1) 50%,
    rgba(var(--wing-purple-rgb, 139, 92, 246), 0.05) 100%
  );

  @media (max-width: 768px) {
    padding: 0.5rem;
  }
`;

export const NavigationBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

export const CenteredLoading = styled.div`
  align-items: center;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 60vh;
`;

export const ActionRow = styled.div<{ $center?: boolean; $bottom?: string }>`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ $bottom }) => ($bottom ? '1rem' : '0.75rem')};
  justify-content: ${({ $center }) => ($center ? 'center' : 'flex-start')};
  margin-bottom: ${({ $bottom }) => $bottom ?? '0'};
`;

export const ErrorContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: rgba(var(--frost-white-rgb, 224, 236, 244), 0.9);

  .error-icon {
    color: var(--warning, #f59e0b);
    margin-bottom: 1.5rem;
  }

  h3 {
    color: var(--text-primary, #E0ECF4);
    margin-bottom: 1rem;
  }

  p {
    margin-bottom: 2rem;
    max-width: 500px;
    line-height: 1.6;
    color: rgba(var(--frost-white-rgb, 224, 236, 244), 0.8);
  }
`;
