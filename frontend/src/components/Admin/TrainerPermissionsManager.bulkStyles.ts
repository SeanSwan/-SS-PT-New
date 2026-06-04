import styled from 'styled-components';
import { motion } from 'framer-motion';
import { permissionTheme } from './TrainerPermissionsManager.styles';

export const BulkActionBarWrap = styled(motion.div)`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: ${permissionTheme.colors.surface};
  border: 1px solid ${permissionTheme.colors.primary};
  border-radius: ${permissionTheme.borderRadius.lg};
  padding: ${permissionTheme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${permissionTheme.spacing.md};
  box-shadow: 0 8px 32px ${permissionTheme.colors.cardShadow};
  z-index: 1000;
  backdrop-filter: blur(20px);

  @media (max-width: 900px) {
    left: 1rem;
    right: 1rem;
    transform: none;
    align-items: stretch;
    flex-direction: column;
  }
`;

export const BulkActionText = styled.div`
  color: ${permissionTheme.colors.text};
  font-weight: 600;
  margin-right: ${permissionTheme.spacing.md};
`;

export const BulkButtons = styled.div`
  display: flex;
  gap: ${permissionTheme.spacing.sm};
  flex-wrap: wrap;
`;
