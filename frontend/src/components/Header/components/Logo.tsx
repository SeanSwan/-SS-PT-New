/**
 * Logo.tsx - Extracted Logo Component
 * Galaxy-themed SwanStudios logo with cosmic animations
 */
import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import logoImage from '../../../assets/Logo.png';

// Galaxy Theme Colors (copied from header for consistency)
const GALAXY_THEME_COLORS = {
  primary: '#00d9ff',
  primaryLight: '#4de6ff',
  textPrimary: '#ffffff',
};

// Animation keyframes (copied from header)
const galaxyFloat = keyframes`
  0% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-3px) rotate(1deg); }
  50% { transform: translateY(-6px) rotate(0deg); }
  75% { transform: translateY(-3px) rotate(-1deg); }
  100% { transform: translateY(0) rotate(0deg); }
`;

const cosmicGlow = keyframes`
  0% { 
    filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.4));
    text-shadow: 0 0 12px rgba(0, 255, 255, 0.6);
  }
  50% { 
    filter: drop-shadow(0 0 16px rgba(0, 255, 255, 0.8));
    text-shadow: 0 0 20px rgba(0, 255, 255, 0.9);
  }
  100% { 
    filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.4));
    text-shadow: 0 0 12px rgba(0, 255, 255, 0.6);
  }
`;

// Styled components (extracted from header.tsx)
const LogoContainer = styled(motion.div)`
  display: flex;
  align-items: center;
  font-weight: 600;
  color: ${GALAXY_THEME_COLORS.primary};
  position: relative;
  margin-right: 24px;
  cursor: pointer;
  z-index: 3;
  
  @media (max-width: 768px) {
    margin-right: 16px;
  }
`;

const LogoElement = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  animation: ${galaxyFloat} 8s ease-in-out infinite;
  
  .logo-text {
    font-size: 1.25rem;
    font-weight: 700;
    color: ${GALAXY_THEME_COLORS.textPrimary};
    position: relative;
    letter-spacing: 0.8px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-shadow: 
      0 0 12px rgba(0, 217, 255, 0.7),
      0 0 24px rgba(0, 217, 255, 0.4),
      0 0 36px rgba(0, 217, 255, 0.2);
    
    /* Improved cosmic text effect with better contrast */
    background: linear-gradient(135deg, ${GALAXY_THEME_COLORS.primary} 0%, ${GALAXY_THEME_COLORS.primaryLight} 50%, ${GALAXY_THEME_COLORS.primary} 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-size: 200% 200%;
  }
  
  img {
    height: 36px;
    width: 36px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    margin-right: 12px;
    filter: 
      drop-shadow(0 0 10px rgba(0, 217, 255, 0.5))
      drop-shadow(0 0 20px rgba(0, 217, 255, 0.25));
    border-radius: 50%;
  }
  
  &:hover {
    .logo-text {
      animation: ${cosmicGlow} 2s ease-in-out;
      background-position: 100% 100%;
    }
    
    img {
      filter: 
        drop-shadow(0 0 16px rgba(0, 217, 255, 0.9))
        drop-shadow(0 0 32px rgba(0, 217, 255, 0.5))
        drop-shadow(0 0 48px rgba(0, 217, 255, 0.25));
      transform: scale(1.1) rotate(5deg);
    }
  }
  
  @media (max-width: 768px) {
    .logo-text {
      font-size: 1.15rem;
    }
    img {
      height: 32px;
      width: 32px;
      margin-right: 10px;
    }
  }
  
  @media (max-width: 480px) {
    .logo-text {
      font-size: 1.1rem;
    }
    img {
      height: 28px;
      width: 28px;
      margin-right: 8px;
    }
  }
`;

// Props interface
interface LogoProps {
  onLogoClick: () => void;
  variants?: any;
}

const Logo: React.FC<LogoProps> = ({ onLogoClick, variants }) => {
  return (
    <LogoContainer
      onClick={onLogoClick}
      variants={variants}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      role="button"
      aria-label="Go to homepage"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onLogoClick();
        }
      }}
    >
      <LogoElement>
        <img src={logoImage} alt="SwanStudios Logo" />
        <span className="logo-text">SwanStudios</span>
      </LogoElement>
    </LogoContainer>
  );
};

export default Logo;