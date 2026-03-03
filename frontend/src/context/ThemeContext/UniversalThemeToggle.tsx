/**
 * UniversalThemeToggle.tsx
 * =======================
 *
 * Crystalline Swan Theme Toggle Component
 *
 * Features:
 * - Three-state toggle: Crystalline Swan -> Arctic Dawn -> Void Crystal
 * - Icons: Sparkles (default) -> Sun (light) -> Zap (dark/neon)
 * - Per-theme styling: glass glow for dark themes, clean solid for light
 * - Smooth morphing animations between states
 * - Mobile-optimized touch interactions (44px minimum target)
 * - WCAG AA accessibility compliance
 * - Tooltips indicating current and next theme
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Sun, Zap } from 'lucide-react';
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
  border-radius: ${({ $currentTheme }) =>
    $currentTheme === 'crystalline-light' ? '12px' : '50%'
  };
  border: ${({ $currentTheme }) => {
    switch ($currentTheme) {
      case 'crystalline-default':
        return '2px solid rgba(96, 192, 240, 0.3)';
      case 'crystalline-light':
        return '2px solid #E2E8F0';
      case 'crystalline-dark':
        return '2px solid rgba(34, 211, 238, 0.4)';
      default:
        return '2px solid transparent';
    }
  }};
  background: ${({ $currentTheme }) => {
    switch ($currentTheme) {
      case 'crystalline-default':
        return 'linear-gradient(135deg, #001545, #60C0F0)';
      case 'crystalline-light':
        return '#FFFFFF';
      case 'crystalline-dark':
        return 'linear-gradient(135deg, #030712, #22D3EE)';
      default:
        return 'linear-gradient(135deg, #001545, #60C0F0)';
    }
  }};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: ${({ $currentTheme }) =>
    $currentTheme === 'crystalline-light' ? 'visible' : 'hidden'
  };
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  color: ${({ $currentTheme }) => {
    switch ($currentTheme) {
      case 'crystalline-default':
        return '#E0ECF4';
      case 'crystalline-light':
        return '#2563EB';
      case 'crystalline-dark':
        return '#22D3EE';
      default:
        return '#E0ECF4';
    }
  }};

  /* Per-theme effects */
  box-shadow: ${({ $currentTheme }) => {
    switch ($currentTheme) {
      case 'crystalline-default':
        return '0 0 20px rgba(96, 192, 240, 0.4), 0 0 40px rgba(0, 21, 69, 0.2)';
      case 'crystalline-light':
        return '0 2px 8px rgba(0, 32, 96, 0.1)';
      case 'crystalline-dark':
        return '0 0 25px rgba(34, 211, 238, 0.5), 0 0 50px rgba(167, 139, 250, 0.2)';
      default:
        return '0 0 20px rgba(96, 192, 240, 0.4)';
    }
  }};

  /* Orbiting particle — only on dark themes */
  &::before {
    content: '';
    position: absolute;
    width: 4px;
    height: 4px;
    background: ${({ $currentTheme }) => {
      switch ($currentTheme) {
        case 'crystalline-default':
          return '#C6A84B';
        case 'crystalline-light':
          return 'transparent';
        case 'crystalline-dark':
          return '#F59E0B';
        default:
          return '#C6A84B';
      }
    }};
    border-radius: 50%;
    animation: ${orbitingParticles} 3s linear infinite;
    opacity: ${({ $currentTheme }) =>
      $currentTheme === 'crystalline-light' ? '0' : '0.8'
    };
  }

  /* Orbiting particle — accent color per theme */
  &::after {
    content: '';
    position: absolute;
    width: 3px;
    height: 3px;
    background: ${({ $currentTheme }) => {
      switch ($currentTheme) {
        case 'crystalline-default':
          return '#60C0F0';
        case 'crystalline-light':
          return 'transparent';
        case 'crystalline-dark':
          return '#A78BFA';
        default:
          return '#60C0F0';
      }
    }};
    border-radius: 50%;
    animation: ${orbitingParticles} 4s linear infinite reverse;
    animation-delay: -1s;
    opacity: ${({ $currentTheme }) =>
      $currentTheme === 'crystalline-light' ? '0' : '0.6'
    };
  }

  &:hover {
    transform: scale(1.1);
    animation: ${({ $currentTheme }) =>
      $currentTheme === 'crystalline-light' ? 'none' : stellarPulse
    } 2s ease-in-out infinite;
    box-shadow: ${({ $currentTheme }) => {
      switch ($currentTheme) {
        case 'crystalline-default':
          return '0 0 30px rgba(96, 192, 240, 0.6), 0 0 60px rgba(198, 168, 75, 0.2)';
        case 'crystalline-light':
          return '0 4px 16px rgba(37, 99, 235, 0.2)';
        case 'crystalline-dark':
          return '0 0 35px rgba(34, 211, 238, 0.7), 0 0 70px rgba(167, 139, 250, 0.3)';
        default:
          return '0 0 30px rgba(96, 192, 240, 0.6)';
      }
    }};
  }

  &:focus {
    outline: 2px solid ${({ $currentTheme }) => {
      switch ($currentTheme) {
        case 'crystalline-default':
          return '#C6A84B';
        case 'crystalline-light':
          return '#2563EB';
        case 'crystalline-dark':
          return '#F59E0B';
        default:
          return '#C6A84B';
      }
    }};
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
  background: ${({ theme }) =>
    theme.id === 'crystalline-light'
      ? '#FFFFFF'
      : theme.id === 'crystalline-dark'
        ? 'rgba(3, 7, 18, 0.95)'
        : 'rgba(0, 21, 69, 0.95)'
  };
  color: ${({ theme }) =>
    theme.id === 'crystalline-light' ? '#0F172A' : '#F1F5F9'
  };
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;
  border: ${({ theme }) =>
    theme.id === 'crystalline-light'
      ? '1px solid #E2E8F0'
      : theme.id === 'crystalline-dark'
        ? '1px solid rgba(34, 211, 238, 0.2)'
        : '1px solid rgba(96, 192, 240, 0.18)'
  };
  backdrop-filter: ${({ theme }) =>
    theme.id === 'crystalline-light' ? 'none' : 'blur(10px)'
  };
  box-shadow: ${({ theme }) =>
    theme.id === 'crystalline-light'
      ? '0 2px 8px rgba(0, 32, 96, 0.1)'
      : theme.id === 'crystalline-dark'
        ? '0 4px 16px rgba(0, 0, 0, 0.6), 0 0 20px rgba(34, 211, 238, 0.1)'
        : '0 4px 16px rgba(0, 0, 0, 0.4)'
  };

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
    border-bottom: 6px solid ${({ theme }) =>
      theme.id === 'crystalline-light'
        ? '#FFFFFF'
        : theme.id === 'crystalline-dark'
          ? 'rgba(3, 7, 18, 0.95)'
          : 'rgba(0, 21, 69, 0.95)'
    };
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
      return <Zap size={size} />;
    default:
      return <Sparkles size={size} />;
  }
};

const getThemeDescription = (themeId: ThemeId) => {
  switch (themeId) {
    case 'crystalline-default':
      return 'Crystalline Swan';
    case 'crystalline-light':
      return 'Arctic Dawn';
    case 'crystalline-dark':
      return 'Void Crystal';
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
