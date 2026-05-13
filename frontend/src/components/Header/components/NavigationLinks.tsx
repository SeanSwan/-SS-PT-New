/**
 * NavigationLinks.tsx - Extracted Desktop Navigation Links Component
 * Galaxy-themed navigation with user authentication state management
 */
import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardSelector from '../../DashboardSelector/DashboardSelector';

// Theme-aware colors via CSS variables (no more hardcoded dark-only values)

// Styled components (extracted from header.tsx)
const NavLinksContainer = styled.div`
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  overflow: visible;
  justify-content: flex-start;
  margin-left: 0;
  
  @media (max-width: 1024px) {
    margin-left: 0;
  }
  
  @media (max-width: 768px) {
    display: none;
  }

  @media (min-width: 2560px) {
    margin-left: 0;
  }

  @media (min-width: 3840px) {
    margin-left: 0;
  }
`;

const Nav = styled(motion.nav)`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  min-width: 0;
  max-width: 100%;
  overflow: visible;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const StyledNavLink = styled(motion(Link))<{ $isActive?: boolean }>`
  color: ${({ $isActive }) =>
    $isActive ? 'var(--accent-primary)' : 'var(--text-secondary)'};
  text-decoration: none;
  margin: 0;
  padding: 12px 16px;
  font-weight: ${({ $isActive }) => $isActive ? 600 : 500};
  font-size: 0.95rem;
  position: relative;
  height: 64px;
  display: flex;
  align-items: center;
  white-space: nowrap;
  flex: 0 1 auto;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.3px;
  border-radius: 8px;

  /* Enhanced hover effects with better contrast */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg,
      color-mix(in srgb, var(--accent-primary) 12%, transparent) 0%,
      color-mix(in srgb, var(--accent-secondary, #ff4081) 6%, transparent) 100%
    );
    border-radius: 8px;
    opacity: ${({ $isActive }) => $isActive ? 1 : 0};
    transition: opacity 0.3s ease;
    z-index: -1;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    width: ${({ $isActive }) => $isActive ? '80%' : '0%'};
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, var(--accent-primary) 50%, transparent 100%);
    transform: translateX(-50%);
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent-primary) 70%, transparent);
  }

  &:hover {
    color: var(--accent-primary);
    text-shadow: 0 0 14px color-mix(in srgb, var(--accent-primary) 70%, transparent);
    transform: translateY(-1px);

    &::before {
      opacity: 1;
    }

    &::after {
      width: 80%;
    }
  }

  /* Focus state for accessibility */
  &:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
    color: var(--accent-primary);
  }
  
  @media (max-width: 1200px) {
    padding: 12px 12px;
    font-size: 0.9rem;
  }
  
  @media (max-width: 1024px) {
    padding: 12px 10px;
    font-size: 0.88rem;
  }

  @media (min-width: 2560px) {
    font-size: 1.1rem;
    padding: 14px 20px;
    height: 72px;
  }

  @media (min-width: 3840px) {
    font-size: 1.25rem;
    padding: 16px 24px;
    height: 80px;
  }
`;

const DashboardSelectorMount = styled.div`
  position: relative;
  z-index: var(--z-dropdown, 1260);
  flex: 0 0 auto;
  margin: 0 8px;
  overflow: visible;

  @media (min-width: 2560px) {
    margin: 0 12px;
  }
`;

/* Secondary nav links hidden at narrow desktop (769-1024px) to prevent crowding */
const SecondaryNavLink = styled(StyledNavLink)`
  @media (max-width: 1024px) {
    display: none;
  }
`;

// Props interface
interface NavigationLinksProps {
  user: any;
  isActive: (path: string) => boolean;
  itemVariants: any;
  containerVariants: any;
}

const NavigationLinks: React.FC<NavigationLinksProps> = ({ 
  user, 
  isActive, 
  itemVariants, 
  containerVariants 
}) => {
  
  const renderDesktopLinks = () => {
    if (user) {
      return (
        <>
          <StyledNavLink
            to="/store"
            $isActive={isActive('/store') || isActive('/shop')}
            variants={itemVariants}
          >
            SwanStudios Store
          </StyledNavLink>

          <DashboardSelectorMount>
            <DashboardSelector />
          </DashboardSelectorMount>
        </>
      );
    } else {
      return (
        <>
          <StyledNavLink 
            to="/store" 
            $isActive={isActive('/store')}
            variants={itemVariants}
          >
            SwanStudios Store
          </StyledNavLink>
          
          <StyledNavLink 
            to="/login" 
            $isActive={isActive('/login')}
            variants={itemVariants}
          >
            Login
          </StyledNavLink>
          
          <StyledNavLink 
            to="/signup" 
            $isActive={isActive('/signup')}
            variants={itemVariants}
          >
            Sign Up
          </StyledNavLink>
        </>
      );
    }
  };

  return (
    <NavLinksContainer>
      <Nav variants={containerVariants}>
        <StyledNavLink 
          to="/" 
          $isActive={isActive('/')}
          variants={itemVariants}
        >
          Home
        </StyledNavLink>
        
        {renderDesktopLinks()}
        
        <SecondaryNavLink
          to="/video-library"
          $isActive={isActive('/video-library')}
          variants={itemVariants}
        >
          Video Library
        </SecondaryNavLink>

        <SecondaryNavLink
          to="/waiver"
          $isActive={isActive('/waiver')}
          variants={itemVariants}
        >
          Waiver
        </SecondaryNavLink>

        <SecondaryNavLink
          to="/contact"
          $isActive={isActive('/contact')}
          variants={itemVariants}
        >
          Contact
        </SecondaryNavLink>

        <SecondaryNavLink
          to="/gallery"
          $isActive={isActive('/gallery')}
          variants={itemVariants}
        >
          Photography
        </SecondaryNavLink>

        <SecondaryNavLink
          to="/about"
          $isActive={isActive('/about')}
          variants={itemVariants}
        >
          About
        </SecondaryNavLink>
      </Nav>
    </NavLinksContainer>
  );
};

export default NavigationLinks;
