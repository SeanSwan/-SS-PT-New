/**
 * NavigationLinks.tsx - Extracted Desktop Navigation Links Component
 * Galaxy-themed navigation with user authentication state management
 */
import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Box } from '@mui/material';
import DashboardSelector from '../../DashboardSelector/DashboardSelector';

// Galaxy Theme Colors (copied from header for consistency)
const GALAXY_THEME_COLORS = {
  primary: '#00d9ff',
  primaryLight: '#4de6ff',
  textSecondary: 'rgba(255, 255, 255, 0.87)',
  accentLight: '#ff6b9d',
  accent: '#ff4081',
};

// Styled components (extracted from header.tsx)
const NavLinksContainer = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: flex-start;
  margin-left: 32px;
  
  @media (max-width: 1024px) {
    margin-left: 24px;
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const Nav = styled(motion.nav)`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const StyledNavLink = styled(motion(Link))<{ $isActive?: boolean }>`
  color: ${({ $isActive }) => 
    $isActive ? GALAXY_THEME_COLORS.primary : GALAXY_THEME_COLORS.textSecondary};
  text-decoration: none;
  margin: 0;
  padding: 12px 16px;
  font-weight: ${({ $isActive }) => $isActive ? 600 : 500};
  font-size: 0.95rem;
  position: relative;
  height: 64px;
  display: flex;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.3px;
  border-radius: 8px;
  
  /* Enhanced galaxy hover effects with better contrast */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, 
      rgba(0, 217, 255, 0.12) 0%, 
      rgba(255, 64, 129, 0.06) 100%
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
    background: linear-gradient(90deg, transparent 0%, ${GALAXY_THEME_COLORS.primary} 50%, transparent 100%);
    transform: translateX(-50%);
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 10px rgba(0, 217, 255, 0.7);
  }
  
  &:hover {
    color: ${GALAXY_THEME_COLORS.primary};
    text-shadow: 0 0 14px rgba(0, 217, 255, 0.7);
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
    outline: 2px solid ${GALAXY_THEME_COLORS.primary};
    outline-offset: 2px;
    color: ${GALAXY_THEME_COLORS.primary};
  }
  
  @media (max-width: 1200px) {
    padding: 12px 12px;
    font-size: 0.9rem;
  }
  
  @media (max-width: 1024px) {
    padding: 12px 10px;
    font-size: 0.88rem;
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
    color: ${GALAXY_THEME_COLORS.accentLight};
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

          <Box sx={{ ml: 1, mr: 1 }}>
            <DashboardSelector />
          </Box>
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
        
        <StyledNavLink 
          to="/contact" 
          $isActive={isActive('/contact')}
          variants={itemVariants}
        >
          Contact
        </StyledNavLink>
        
        <StyledNavLink 
          to="/about" 
          $isActive={isActive('/about')}
          variants={itemVariants}
        >
          About Us
        </StyledNavLink>
      </Nav>
    </NavLinksContainer>
  );
};

export default NavigationLinks;