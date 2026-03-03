/**
 * ActionIcons.tsx - Extracted Action Icons Component
 * Galaxy-themed right-side action icons (cart, notifications, profile, etc.)
 */
import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Swan primitives
import { Tooltip, IconButton, Badge } from '../../ui/primitives/components';

// Icons (lucide-react replacements for MUI icons)
import { ShoppingCart, User } from 'lucide-react';

import EnhancedNotificationSectionWrapper from '../EnhancedNotificationSectionWrapper';
import UniversalThemeToggle from '../../../context/ThemeContext/UniversalThemeToggle';

// Theme-aware colors via CSS variables (no more hardcoded dark-only values)

// Styled components
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

const CartIconButton = styled(IconButton)`
  color: var(--text-secondary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    color: var(--accent-primary);
    background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
    transform: scale(1.05);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }
`;

const ProfileIconButton = styled(IconButton)`
  background: var(--accent-primary);
  width: 36px;
  height: 36px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--bg-base);
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary) 50%, transparent);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    filter: brightness(1.15);
    box-shadow: 0 0 28px color-mix(in srgb, var(--accent-primary) 70%, transparent);
    transform: scale(1.1) rotate(5deg);
  }

  &:focus-visible {
    outline: 3px solid var(--accent-secondary, #ff4081);
    outline-offset: 2px;
  }
`;

const SignInIconButton = styled(IconButton)`
  color: var(--text-secondary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    color: var(--accent-primary);
    background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
    transform: scale(1.05);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }
`;

const LogoutButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-secondary);
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
    color: var(--danger, #ff4081);
    text-shadow: 0 0 14px rgba(255, 107, 157, 0.7);
    transform: translateY(-1px);
    &::before { opacity: 1; }
  }

  &:focus-visible {
    outline: 2px solid var(--danger, #ff4081);
    outline-offset: 2px;
    color: var(--danger, #ff4081);
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
  user, cart, isMobile, onCartOpen, onLogout, itemVariants, containerVariants
}) => {
  const navigate = useNavigate();

  return (
    <ActionsContainer variants={containerVariants}>
      {/* Notifications for authenticated users */}
      {user && (
        <motion.div variants={itemVariants}>
          <EnhancedNotificationSectionWrapper />
        </motion.div>
      )}

      {/* Shopping Cart */}
      <motion.div variants={itemVariants}>
        <Tooltip title="Shopping Cart">
          <CartIconButton onClick={onCartOpen} aria-label="Open shopping cart">
            <Badge badgeContent={cart?.itemCount || 0} color="error">
              <ShoppingCart size={20} />
            </Badge>
          </CartIconButton>
        </Tooltip>
      </motion.div>

      {/* Universal Theme Toggle */}
      <motion.div variants={itemVariants}>
        <UniversalThemeToggle size="medium" />
      </motion.div>

      {/* User Profile or Login */}
      {user ? (
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tooltip title={`${user?.firstName || 'User'} Profile`}>
            <ProfileIconButton aria-label="User profile">
              {user?.firstName?.[0]?.toUpperCase() || 'U'}
            </ProfileIconButton>
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
              <Tooltip title="Sign In">
                <SignInIconButton onClick={() => navigate('/login')} aria-label="Sign in">
                  <User size={20} />
                </SignInIconButton>
              </Tooltip>
            </motion.div>
          )}
        </>
      )}
    </ActionsContainer>
  );
};

export default ActionIcons;
