import styled from 'styled-components';
import { motion } from 'framer-motion';

export const ExecutiveLayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  width: 100%;
  background: ${props => props.theme.gradients.dataFlow};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      radial-gradient(2px 2px at 40px 60px, rgba(59, 130, 246, 0.3), transparent),
      radial-gradient(1px 1px at 90px 120px, rgba(14, 165, 233, 0.2), transparent),
      radial-gradient(1px 1px at 170px 80px, rgba(255, 255, 255, 0.1), transparent);
    background-size: 200px 160px;
    background-repeat: repeat;
    animation: commandFloat 60s linear infinite;
    opacity: 0.4;
    pointer-events: none;
    z-index: -1;
  }

  @keyframes commandFloat {
    0% { transform: translateY(0) rotate(0deg); }
    100% { transform: translateY(-20px) rotate(360deg); }
  }
`;

export const ExecutiveMainContent = styled(motion.main)`
  flex: 1;
  margin-left: 280px;
  padding: ${props => props.theme.spacing.lg};
  min-height: 100vh;
  position: relative;
  background: rgba(248, 250, 252, 0.02);
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    margin-left: 0;
    padding: ${props => props.theme.spacing.md};
  }
`;

export const ExecutivePageContainer = styled(motion.div)`
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

export const ExecutiveLoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  text-align: center;
`;

export const ExecutiveLoadingSpinner = styled(motion.div)`
  width: 60px;
  height: 60px;
  border: 4px solid rgba(59, 130, 246, 0.2);
  border-left: 4px solid ${props => props.theme.colors.stellarAuthority};
  border-radius: 50%;
  margin-bottom: ${props => props.theme.spacing.lg};
`;

export const ExecutiveErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  text-align: center;
  padding: ${props => props.theme.spacing.xl};

  h2 {
    color: ${props => props.theme.colors.criticalRed};
    margin-bottom: ${props => props.theme.spacing.md};
    font-size: 1.5rem;
    font-weight: ${props => props.theme.typography.weights.semibold};
  }

  p {
    color: ${props => props.theme.colors.platinumSilver};
    margin-bottom: ${props => props.theme.spacing.lg};
    max-width: 600px;
    line-height: 1.6;
  }
`;

export const ExecutiveButton = styled(motion.button)`
  background: ${props => props.theme.gradients.commandCenter};
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: ${props => props.theme.borderRadius.md};
  color: ${props => props.theme.colors.stellarWhite};
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  font-weight: ${props => props.theme.typography.weights.medium};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: ${props => props.theme.shadows.commandGlow};
    transform: translateY(-2px);
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors.stellarAuthority};
    outline-offset: 2px;
  }
`;
