/**
 * UniversalThemeToggle.tsx
 * =======================
 *
 * Crystalline Swan Theme Toggle Component
 *
 * Features:
 * - Three-state toggle: Crystalline Default -> Light -> Dark
 * - Icons: Sparkles (default) -> Sun (light) -> Moon (dark)
 * - Smooth morphing animations between states
 * - Mobile-optimized touch interactions (44px minimum target)
 * - WCAG AA accessibility compliance
 * - Tooltips indicating current and next theme
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Sun, Moon } from 'lucide-react';
import { useUniversalTheme, ThemeId } from './UniversalThemeContext';

// === KEYFRAME ANIMATIONS ===
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
  background: ${({ $currentTheme }) => {
    switch ($currentTheme) {
      case 'crystalline-default':
        return 'linear-gradient(135deg, #002060, #60C0F0)';
      case 'crystalline-light':
        return 'linear-gradient(135deg, #50A0F0, #F5F8FC)';
      case 'crystalline-dark':
        return 'linear-gradient(135deg, #000A1A, #4070C0)';
      default:
        return 'linear-gradient(135deg, #002060, #60C0F0)';
    }
  }};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  color: ${({ $currentTheme }) =>
    $currentTheme === 'crystalline-light' ? '#002060' : '#E0ECF4'
  };

  /* Crystalline glow effect */
  box-shadow: ${({ $currentTheme }) => {
    switch ($currentTheme) {
      case 'crystalline-default':
        return '0 0 20px rgba(96, 192, 240, 0.4), 0 0 40px rgba(0, 32, 96, 0.2)';
      case 'crystalline-light':
        return '0 0 20px rgba(80, 160, 240, 0.3), 0 0 40px rgba(198, 168, 75, 0.15)';
      case 'crystalline-dark':
        return '0 0 20px rgba(96, 192, 240, 0.5), 0 0 40px rgba(64, 112, 192, 0.3)';
      default:
        return '0 0 20px rgba(96, 192, 240, 0.4)';
    }
  }};

  /* Orbiting particle — gold accent */
  &::before {
    content: '';
    position: absolute;
    width: 4px;
    height: 4px;
    background: ${({ $currentTheme }) =>
      $currentTheme === 'crystalline-light' ? '#C6A84B' : '#C6A84B'
    };
    border-radius: 50%;
    animation: ${orbitingParticles} 3s linear infinite;
    opacity: 0.8;
  }

  /* Orbiting particle — ice accent */
  &::after {
    content: '';
    position: absolute;
    width: 3px;
    height: 3px;
    background: ${({ $currentTheme }) =>
      $currentTheme === 'crystalline-light' ? '#4070C0' : '#60C0F0'
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
        case 'crystalline-default':
          return '0 0 30px rgba(96, 192, 240, 0.6), 0 0 60px rgba(198, 168, 75, 0.2)';
        case 'crystalline-light':
          return '0 0 30px rgba(80, 160, 240, 0.5), 0 0 60px rgba(198, 168, 75, 0.2)';
        case 'crystalline-dark':
          return '0 0 30px rgba(96, 192, 240, 0.7), 0 0 60px rgba(64, 112, 192, 0.4)';
        default:
          return '0 0 30px rgba(96, 192, 240, 0.6)';
      }
    }};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors?.accent || '#C6A84B'};
    outline-offset: 3px;
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
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
  background: rgba(0, 10, 26, 0.95);
  color: #E0ECF4;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;
  border: 1px solid rgba(96, 192, 240, 0.15);
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
    border-bottom: 6px solid rgba(0, 10, 26, 0.95);
  }
`;

// === THEME ICON MAPPING ===
const getThemeIcon = (themeId: ThemeId, size = 20) => {
  switch (themeId) {
    case 'crystalline-default':
      return <Sparkles size={size} />;
    case 'crystalline-light':
      return <Sun size={size} />;
    case 'crystalline-dark':
      return <Moon size={size} />;
    default:
      return <Sparkles size={size} />;
  }
};

const getThemeDescription = (themeId: ThemeId) => {
  switch (themeId) {
    case 'crystalline-default':
      return 'Crystalline Swan';
    case 'crystalline-light':
      return 'Crystalline Light';
    case 'crystalline-dark':
      return 'Crystalline Dark';
    default:
      return 'Crystalline Swan';
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
        title={`Current: ${getThemeDescription(currentTheme)} — Click to switch`}
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
