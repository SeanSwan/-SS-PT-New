import styled from 'styled-components';
import { motion } from 'framer-motion';

export const CommandCard = styled(motion.div)`
  background: ${({ theme }) => theme.background?.card || 'rgba(30, 58, 138, 0.2)'};
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: ${({ theme }) => theme.borders?.elegant || '1px solid rgba(59, 130, 246, 0.3)'};
  transition: all 0.3s ease;

  &:hover {
    background: ${({ theme }) => theme.background?.elevated || 'rgba(30, 58, 138, 0.3)'};
    transform: translateY(-4px);
    box-shadow: ${({ theme }) => theme.shadows?.primary || '0 12px 40px rgba(59, 130, 246, 0.2)'};
  }

  @media (max-width: 768px) {
    border-radius: 12px;

    &:hover {
      transform: translateY(-2px);
    }
  }
`;
