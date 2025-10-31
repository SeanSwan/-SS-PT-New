/**
 * ActionIcons.tsx - Extracted Action Icons Component
 * Galaxy-themed right-side action icons (cart, notifications, profile, etc.)
 */
import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Tooltip,
  IconButton,
  Badge
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PersonIcon from '@mui/icons-material/Person';

import EnhancedNotificationSectionWrapper from '../EnhancedNotificationSectionWrapper';
import UniversalThemeToggle from '../../../context/ThemeContext/UniversalThemeToggle';

// Galaxy Theme Colors (copied from header for consistency)
const GALAXY_THEME_COLORS = {
  primary: '#00d9ff',
  primaryLight: '#4de6ff',
  textSecondary: 'rgba(255, 255, 255, 0.87)',
  textPrimary: '#ffffff',
  accent: '#ff4081',
  backgroundPrimary: 'rgba(8, 8, 20, 0.95)',
};

// Styled components (extracted from header.tsx)
const ActionsContainer = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  z-index: 3;
  
  @media (max-width: 768px) {
    gap: 8px;
  }
  
  @media (max-width: 480px) {
    gap: 6px;
  }
`;

const LogoutButton = styled.button`
  background: transparent;
  border: none;
  color: ${GALAXY_THEME_COLORS.textSecondary};
  padding: 10px 16px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, 
      rgba(255, 64, 129, 0.12) 0%, 
      rgba(244, 67, 54, 0.08) 100%
    );
    border-radius: 8px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    color: ${GALAXY_THEME_COLORS.accent};
    text-shadow: 0 0 14px rgba(255, 107, 157, 0.7);
    transform: translateY(-1px);
    
    &::before {
      opacity: 1;
    }
  }
  
  /* Focus state for accessibility */
  &:focus-visible {
    outline: 2px solid ${GALAXY_THEME_COLORS.accent};
    outline-offset: 2px;
    color: ${GALAXY_THEME_COLORS.accent};
  }
`;

// Props interface
interface ActionIconsProps {
  user: any;
  cart: any;
  isMobile: boolean;
  onCartOpen: () => void;
  onLogout: () => void;
  itemVariants: any;
  containerVariants: any;
}

const ActionIcons: React.FC<ActionIconsProps> = ({ 
  user, 
  cart, 
  isMobile, 
  onCartOpen, 
  onLogout, 
  itemVariants, 
  containerVariants 
}) => {
  const navigate = useNavigate();

  return (
    <ActionsContainer variants={containerVariants}>
      {/* Notifications for authenticated users - DISABLED DUE TO PERSISTENT REACT ERROR #306 */}
      {/* TODO: Re-enable after comprehensive MUI elimination and production testing */}
      {false && user && (
        <motion.div variants={itemVariants}>
          <EnhancedNotificationSectionWrapper />
        </motion.div>
      )}

      {/* Shopping Cart */}
      <motion.div variants={itemVariants}>
        <Tooltip title="Shopping Cart" arrow>
          <IconButton 
            onClick={onCartOpen}
            sx={{ 
              color: GALAXY_THEME_COLORS.textSecondary,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                color: GALAXY_THEME_COLORS.primary,
                backgroundColor: `rgba(0, 217, 255, 0.12)`,
                transform: 'scale(1.05)',
              },
              '&:focus-visible': {
                outline: `2px solid ${GALAXY_THEME_COLORS.primary}`,
                outlineOffset: '2px'
              }
            }}
            aria-label="Open shopping cart"
          >
            <Badge 
              badgeContent={cart?.itemCount || 0} 
              color="error"
              sx={{ 
                '& .MuiBadge-badge': {
                  backgroundColor: GALAXY_THEME_COLORS.accent,
                  fontSize: '0.65rem',
                  minWidth: '18px',
                  height: '18px',
                  boxShadow: `0 0 10px rgba(255, 64, 129, 0.7)`,
                  fontWeight: 600,
                  color: GALAXY_THEME_COLORS.textPrimary
                }
              }}
            >
              <ShoppingCartIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
      </motion.div>

      {/* Universal Theme Toggle */}
      <motion.div variants={itemVariants}>
        <UniversalThemeToggle size="medium" />
      </motion.div>

      {/* User Profile or Login */}
      {user ? (
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tooltip title={`${user?.firstName || 'User'} Profile`} arrow>
            <IconButton
              sx={{ 
                bgcolor: GALAXY_THEME_COLORS.primary,
                width: 36,
                height: 36,
                fontSize: '0.9rem',
                fontWeight: 600,
                color: GALAXY_THEME_COLORS.backgroundPrimary,
                boxShadow: `0 0 18px rgba(0, 217, 255, 0.5)`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: GALAXY_THEME_COLORS.primaryLight,
                  boxShadow: `0 0 28px rgba(0, 217, 255, 0.7)`,
                  transform: 'scale(1.1) rotate(5deg)'
                },
                '&:focus-visible': {
                  outline: `3px solid ${GALAXY_THEME_COLORS.accent}`,
                  outlineOffset: '2px'
                }
              }}
              aria-label="User profile"
            >
              {user?.firstName?.[0]?.toUpperCase() || 'U'}
            </IconButton>
          </Tooltip>
          
          {!isMobile && (
            <LogoutButton onClick={onLogout}>
              Logout
            </LogoutButton>
          )}
        </motion.div>
      ) : (
        <>
          {isMobile && (
            <motion.div variants={itemVariants}>
              <Tooltip title="Sign In" arrow>
                <IconButton
                  onClick={() => navigate('/login')}
                  sx={{ 
                    color: GALAXY_THEME_COLORS.textSecondary,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      color: GALAXY_THEME_COLORS.primary,
                      backgroundColor: `rgba(0, 217, 255, 0.12)`,
                      transform: 'scale(1.05)'
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${GALAXY_THEME_COLORS.primary}`,
                      outlineOffset: '2px'
                    }
                  }}
                  aria-label="Sign in"
                >
                  <PersonIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </motion.div>
          )}
        </>
      )}
    </ActionsContainer>
  );
};

export default ActionIcons;