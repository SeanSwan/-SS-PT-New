/**
 * MobileMenu.tsx - Extracted Mobile Menu Component
 * Galaxy-themed mobile slide-out navigation menu
 */
import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Swan primitives
import { IconButton } from '../../ui/primitives/components';

// Icons (lucide-react replacements for MUI icons)
import { Menu, X, ShoppingBag, User, LayoutDashboard, Users } from 'lucide-react';

// Galaxy Theme Colors (copied from header for consistency)
const GALAXY_THEME_COLORS = {
  primary: '#00d9ff',
  primaryLight: '#4de6ff',
  textSecondary: 'rgba(255, 255, 255, 0.87)',
  textPrimary: '#ffffff',
  accent: '#ff4081',
  accentLight: '#ff6b9d',
  backgroundPrimary: 'rgba(8, 8, 20, 0.95)',
  backgroundSecondary: 'rgba(16, 16, 32, 0.9)',
};

// Animation keyframes
const starTwinkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
`;

// Styled components
const MobileMenuButton = styled(IconButton)<{ $isOpen: boolean }>`
  display: none;
  color: ${GALAXY_THEME_COLORS.textSecondary};
  padding: 8px;
  border-radius: 12px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${({ $isOpen }) =>
      $isOpen
        ? 'linear-gradient(135deg, rgba(255, 64, 108, 0.2) 0%, rgba(255, 0, 0, 0.1) 100%)'
        : 'linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(255, 64, 108, 0.05) 100%)'
    };
    border-radius: 12px;
    opacity: ${({ $isOpen }) => $isOpen ? 1 : 0};
    transition: opacity 0.3s ease;
  }

  @media (max-width: 768px) {
    display: flex;
  }

  &:hover {
    color: ${({ $isOpen }) => $isOpen ? GALAXY_THEME_COLORS.accentLight : GALAXY_THEME_COLORS.primary};
    background: none;
    transform: scale(1.05);

    &::before {
      opacity: 1;
    }
  }

  &:focus-visible {
    outline: 2px solid ${GALAXY_THEME_COLORS.primary};
    outline-offset: 2px;
  }
`;

const MobileMenuOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg,
    ${GALAXY_THEME_COLORS.backgroundPrimary} 0%,
    rgba(16, 16, 32, 0.98) 35%,
    ${GALAXY_THEME_COLORS.backgroundSecondary} 100%
  );
  backdrop-filter: blur(20px) saturate(1.8);
  padding: 80px 24px 24px;
  display: flex;
  flex-direction: column;
  z-index: 1001;
  overflow-y: auto;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 30%, rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                radial-gradient(circle at 80% 70%, rgba(255, 64, 108, 0.1) 1px, transparent 1px),
                radial-gradient(circle at 40% 80%, rgba(0, 255, 255, 0.08) 1px, transparent 1px);
    background-size: 50px 50px, 80px 80px, 60px 60px;
    animation: ${starTwinkle} 4s ease-in-out infinite alternate;
    pointer-events: none;
  }

  @media (max-width: 480px) {
    padding: 70px 20px 20px;
  }
`;

const MobileNavLink = styled(motion(Link))<{ $isActive?: boolean }>`
  margin: 6px 0;
  color: ${({ $isActive }) => $isActive ? GALAXY_THEME_COLORS.primary : GALAXY_THEME_COLORS.textSecondary};
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: ${({ $isActive }) => $isActive ? 600 : 500};
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  background: ${({ $isActive }) =>
    $isActive
      ? `linear-gradient(135deg, rgba(0, 217, 255, 0.12) 0%, rgba(255, 64, 129, 0.06) 100%)`
      : 'transparent'
  };

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: ${({ $isActive }) => $isActive ? '4px' : '0px'};
    height: 60%;
    background: linear-gradient(180deg, ${GALAXY_THEME_COLORS.primary} 0%, ${GALAXY_THEME_COLORS.accentLight} 100%);
    transform: translateY(-50%);
    border-radius: 2px;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 12px rgba(0, 255, 255, 0.8);
  }

  &:hover {
    color: ${GALAXY_THEME_COLORS.primary};
    background: linear-gradient(135deg, rgba(0, 217, 255, 0.18) 0%, rgba(255, 64, 129, 0.09) 100%);
    text-shadow: 0 0 14px rgba(0, 217, 255, 0.7);
    transform: translateX(8px);

    &::after {
      width: 4px;
    }
  }

  svg {
    filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.4));
  }

  @media (max-width: 480px) {
    font-size: 1rem;
    padding: 14px 16px;
    margin: 4px 0;
  }
`;

const MobileLogoutButton = styled(motion.button)`
  margin: 8px 0;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  font-weight: 500;
  padding: 16px 20px;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  &:hover {
    color: ${GALAXY_THEME_COLORS.accentLight};
    background: linear-gradient(135deg, rgba(255, 64, 129, 0.18) 0%, rgba(244, 67, 54, 0.09) 100%);
    text-shadow: 0 0 14px rgba(255, 107, 157, 0.7);
    transform: translateX(8px);
  }

  @media (max-width: 480px) {
    font-size: 1rem;
    padding: 14px 16px;
    margin: 4px 0;
  }
`;

// Animation variants
const mobileMenuVariants = {
  closed: { opacity: 0, x: "-100%", transition: { duration: 0.4, ease: "easeInOut" } },
  open: { opacity: 1, x: "0%", transition: { duration: 0.4, ease: "easeInOut", when: "beforeChildren", staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
};

// Props interface
interface MobileMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  user: any;
  isActive: (path: string) => boolean;
  isRoleEnabled: (role: string) => boolean;
  onLogout: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen, onToggle, user, isActive, isRoleEnabled, onLogout
}) => {
  const closeMobileMenu = () => { onToggle(); };

  const renderMobileLinks = () => {
    if (user) {
      return (
        <>
          <motion.div variants={itemVariants}>
            <MobileNavLink to="/store" onClick={closeMobileMenu} $isActive={isActive('/store') || isActive('/shop')}>
              <ShoppingBag size={20} /> SwanStudios Store
            </MobileNavLink>
          </motion.div>
          {isRoleEnabled('admin') && (
            <motion.div variants={itemVariants}>
              <MobileNavLink to="/dashboard/default" onClick={closeMobileMenu} $isActive={isActive('/dashboard')}>
                <LayoutDashboard size={20} /> Admin Dashboard
              </MobileNavLink>
            </motion.div>
          )}
          {isRoleEnabled('trainer') && (
            <motion.div variants={itemVariants}>
              <MobileNavLink to="/trainer-dashboard" onClick={closeMobileMenu} $isActive={isActive('/trainer-dashboard')}>
                <Users size={20} /> Trainer Dashboard
              </MobileNavLink>
            </motion.div>
          )}
          {isRoleEnabled('client') && (
            <motion.div variants={itemVariants}>
              <MobileNavLink to="/client-dashboard" onClick={closeMobileMenu} $isActive={isActive('/client-dashboard')}>
                <User size={20} /> Client Dashboard
              </MobileNavLink>
            </motion.div>
          )}
          <motion.div variants={itemVariants}>
            <MobileNavLink to="/user-dashboard" onClick={closeMobileMenu} $isActive={isActive('/user-dashboard')}>
              <User size={20} /> User Dashboard
            </MobileNavLink>
          </motion.div>
          <motion.div variants={itemVariants}>
            <MobileNavLink to="/contact" onClick={closeMobileMenu} $isActive={isActive('/contact')}>
              Contact
            </MobileNavLink>
          </motion.div>
          <motion.div variants={itemVariants}>
            <MobileNavLink to="/about" onClick={closeMobileMenu} $isActive={isActive('/about')}>
              About Us
            </MobileNavLink>
          </motion.div>
          <motion.div variants={itemVariants}>
            <MobileLogoutButton onClick={onLogout}>
              Logout
            </MobileLogoutButton>
          </motion.div>
        </>
      );
    } else {
      return (
        <>
          <motion.div variants={itemVariants}>
            <MobileNavLink to="/store" onClick={closeMobileMenu} $isActive={isActive('/store')}>
              <ShoppingBag size={20} /> SwanStudios Store
            </MobileNavLink>
          </motion.div>
          <motion.div variants={itemVariants}>
            <MobileNavLink to="/contact" onClick={closeMobileMenu} $isActive={isActive('/contact')}>Contact</MobileNavLink>
          </motion.div>
          <motion.div variants={itemVariants}>
            <MobileNavLink to="/about" onClick={closeMobileMenu} $isActive={isActive('/about')}>About Us</MobileNavLink>
          </motion.div>
          <motion.div variants={itemVariants}>
            <MobileNavLink to="/login" onClick={closeMobileMenu} $isActive={isActive('/login')}>Login</MobileNavLink>
          </motion.div>
          <motion.div variants={itemVariants}>
            <MobileNavLink to="/signup" onClick={closeMobileMenu} $isActive={isActive('/signup')}>Sign Up</MobileNavLink>
          </motion.div>
        </>
      );
    }
  };

  return (
    <>
      <MobileMenuButton $isOpen={isOpen} onClick={onToggle} aria-label={isOpen ? 'Close menu' : 'Open menu'} aria-expanded={isOpen}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </MobileMenuButton>

      <AnimatePresence>
        {isOpen && (
          <MobileMenuOverlay initial="closed" animate="open" exit="closed" variants={mobileMenuVariants} role="navigation" aria-label="Mobile navigation menu">
            <motion.div variants={itemVariants}>
              <MobileNavLink to="/" onClick={closeMobileMenu} $isActive={isActive('/')}>Home</MobileNavLink>
            </motion.div>
            {renderMobileLinks()}
          </MobileMenuOverlay>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileMenu;
