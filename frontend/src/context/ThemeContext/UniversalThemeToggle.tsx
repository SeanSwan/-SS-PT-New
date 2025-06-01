/**
 * UniversalThemeToggle.tsx
 * =======================
 * 
 * Cosmic Theme Toggle Component for Universal Theme Switching
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Stunning cosmic toggle animation with theme-aware colors
 * - Three-state toggle: Swan Galaxy → Admin Command → Dark Galaxy
 * - Smooth morphing animations between states
 * - Mobile-optimized touch interactions
 * - WCAG AA accessibility compliance
 * - Tooltips indicating current and next theme
 * 
 * Master Prompt v28 Alignment:
 * - Award-winning micro-interactions with stellar animations
 * - Mobile-first responsive design
 * - Accessibility as art
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Moon, Command } from 'lucide-react';
import { useUniversalTheme, ThemeId } from './UniversalThemeContext';

// === KEYFRAME ANIMATIONS ===
const cosmicRotate = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const stellarPulse = keyframes`
  0%, 100% { 
    opacity: 0.8; 
    transform: scale(1);
    filter: brightness(1);
  }
  50% { 
    opacity: 1; 
    transform: scale(1.05);
    filter: brightness(1.2);
  }
`;

const orbitingParticles = keyframes`
  0% { transform: rotate(0deg) translateX(20px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(20px) rotate(-360deg); }
`;

// === STYLED COMPONENTS ===
const ThemeToggleContainer = styled(motion.div)`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ThemeToggleButton = styled(motion.button)<{ $currentTheme: ThemeId }>`
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: ${({ $currentTheme, theme }) => {
    switch ($currentTheme) {
      case 'swan-galaxy':
        return theme.gradients?.primary || 'linear-gradient(135deg, #00FFFF, #00A0E3)';
      case 'admin-command':
        return theme.gradients?.primary || 'linear-gradient(135deg, #3b82f6, #2563eb)';
      case 'dark-galaxy':
        return theme.gradients?.secondary || 'linear-gradient(135deg, #4a5568, #2d3748)';
      default:
        return theme.gradients?.primary || '#00FFFF';
    }
  }};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  color: ${({ $currentTheme }) => 
    $currentTheme === 'dark-galaxy' ? '#ffffff' : 
    $currentTheme === 'admin-command' ? '#ffffff' : '#000000'
  };
  
  /* Cosmic glow effect */
  box-shadow: ${({ $currentTheme, theme }) => {
    switch ($currentTheme) {
      case 'swan-galaxy':
        return '0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(0, 160, 227, 0.2)';
      case 'admin-command':
        return '0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(37, 99, 235, 0.2)';
      case 'dark-galaxy':
        return '0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(0, 255, 255, 0.2)';
      default:
        return theme.shadows?.primary || '0 0 20px rgba(0, 255, 255, 0.3)';
    }
  }};
  
  /* Hovering orbital particles */
  &::before {
    content: '';
    position: absolute;
    width: 4px;
    height: 4px;
    background: ${({ $currentTheme }) => 
      $currentTheme === 'dark-galaxy' ? '#00ffff' : 
      $currentTheme === 'admin-command' ? '#00ffff' : '#FFD700'
    };
    border-radius: 50%;
    animation: ${orbitingParticles} 3s linear infinite;
    opacity: 0.8;
  }
  
  &::after {
    content: '';
    position: absolute;
    width: 3px;
    height: 3px;
    background: ${({ $currentTheme }) => 
      $currentTheme === 'dark-galaxy' ? '#ffffff' : 
      $currentTheme === 'admin-command' ? '#a5f3fc' : '#c8b6ff'
    };
    border-radius: 50%;
    animation: ${orbitingParticles} 4s linear infinite reverse;
    animation-delay: -1s;
    opacity: 0.6;
  }
  
  &:hover {
    transform: scale(1.1);
    animation: ${stellarPulse} 2s ease-in-out infinite;
    box-shadow: ${({ $currentTheme }) => {
      switch ($currentTheme) {
        case 'swan-galaxy':
          return '0 0 30px rgba(0, 255, 255, 0.6), 0 0 60px rgba(255, 215, 0, 0.3)';
        case 'admin-command':
          return '0 0 30px rgba(59, 130, 246, 0.6), 0 0 60px rgba(0, 255, 255, 0.3)';
        case 'dark-galaxy':
          return '0 0 30px rgba(255, 255, 255, 0.5), 0 0 60px rgba(0, 255, 255, 0.4)';
        default:
          return '0 0 30px rgba(0, 255, 255, 0.6)';
      }
    }};
  }
  
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors?.accent || '#FFD700'};
    outline-offset: 3px;
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
  }
`;

const ThemeIcon = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 2;
`;

const TooltipContainer = styled(motion.div)`
  position: absolute;
  bottom: -45px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 10, 15, 0.95);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  
  &::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 6px solid rgba(10, 10, 15, 0.95);
  }
`;

// === THEME ICON MAPPING ===
const getThemeIcon = (themeId: ThemeId, size = 20) => {
  switch (themeId) {
    case 'swan-galaxy':
      return <Palette size={size} />;
    case 'admin-command':
      return <Command size={size} />;
    case 'dark-galaxy':
      return <Moon size={size} />;
    default:
      return <Palette size={size} />;
  }
};

const getThemeDescription = (themeId: ThemeId) => {
  switch (themeId) {
    case 'swan-galaxy':
      return 'Swan Galaxy Theme';
    case 'admin-command':
      return 'Admin Command Theme';
    case 'dark-galaxy':
      return 'Dark Galaxy Theme';
    default:
      return 'Current Theme';
  }
};

// === MAIN COMPONENT ===
interface UniversalThemeToggleProps {
  showTooltip?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const UniversalThemeToggle: React.FC<UniversalThemeToggleProps> = ({
  showTooltip = true,
  size = 'medium',
  className
}) => {
  const { currentTheme, toggleTheme, availableThemes } = useUniversalTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltipState, setShowTooltipState] = useState(false);

  // Get next theme for tooltip
  const themeIds = availableThemes.map(t => t.id);
  const currentIndex = themeIds.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % themeIds.length;
  const nextTheme = themeIds[nextIndex];

  // Handle tooltip display
  useEffect(() => {
    if (isHovered && showTooltip) {
      const timer = setTimeout(() => setShowTooltipState(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowTooltipState(false);
    }
  }, [isHovered, showTooltip]);

  // Animation variants
  const iconVariants = {
    idle: { 
      scale: 1, 
      rotate: 0,
      transition: { duration: 0.3 }
    },
    hover: { 
      scale: 1.1, 
      rotate: 15,
      transition: { duration: 0.3 }
    },
    tap: { 
      scale: 0.9, 
      rotate: -15,
      transition: { duration: 0.1 }
    }
  };

  const tooltipVariants = {
    hidden: { 
      opacity: 0, 
      y: 10,
      scale: 0.8
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    }
  };

  return (
    <ThemeToggleContainer className={className}>
      <ThemeToggleButton
        $currentTheme={currentTheme}
        onClick={toggleTheme}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover="hover"
        whileTap="tap"
        aria-label={`Switch to ${getThemeDescription(nextTheme)}`}
        title={`Current: ${getThemeDescription(currentTheme)} - Click to switch`}
      >
        <ThemeIcon
          as={motion.div}
          variants={iconVariants}
          initial="idle"
          animate={isHovered ? "hover" : "idle"}
          whileTap="tap"
        >
          {getThemeIcon(currentTheme, size === 'small' ? 16 : size === 'large' ? 24 : 20)}
        </ThemeIcon>
      </ThemeToggleButton>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltipState && (
          <TooltipContainer
            variants={tooltipVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            Click for {getThemeDescription(nextTheme)}
          </TooltipContainer>
        )}
      </AnimatePresence>
    </ThemeToggleContainer>
  );
};

export default UniversalThemeToggle;