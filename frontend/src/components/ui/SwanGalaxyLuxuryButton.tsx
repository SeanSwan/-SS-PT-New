/**
 * SwanGalaxyLuxuryButton.tsx
 * ===========================
 * 
 * Premium luxury button component inspired by the training packages storefront
 * Uses Galaxy Swan theme colors with expensive, high-end styling
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';

// Galaxy Swan Theme Colors
const GALAXY_SWAN_COLORS = {
  primary: {
    main: '#00FFFF', // Cyan
    blue: '#00A0E3', // Blue
    dark: '#0088CC',
    light: '#33FFFF'
  },
  secondary: {
    main: '#7851A9', // Purple
    dark: '#5D3F87',
    light: '#9B6FBF'
  },
  accent: {
    gold: '#FFD700',
    plasma: '#00FF88',
    ruby: '#FF416C',
    cosmic: '#C8B6FF'
  },
  neutral: {
    black: '#0A0A1A',
    darkBlue: '#1E1E3F',
    white: '#FFFFFF'
  }
};

// Luxury animations
const luxuryShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const luxuryGlow = keyframes`
  0%, 100% { 
    box-shadow: 
      0 0 20px rgba(0, 255, 255, 0.4),
      0 0 40px rgba(120, 81, 169, 0.3),
      inset 0 0 20px rgba(255, 255, 255, 0.1);
  }
  50% { 
    box-shadow: 
      0 0 30px rgba(0, 255, 255, 0.8),
      0 0 60px rgba(120, 81, 169, 0.6),
      inset 0 0 30px rgba(255, 255, 255, 0.2);
  }
`;

const luxuryPulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const diamondSparkle = keyframes`
  0%, 100% { opacity: 0.6; transform: rotate(0deg) scale(1); }
  25% { opacity: 1; transform: rotate(90deg) scale(1.1); }
  50% { opacity: 0.8; transform: rotate(180deg) scale(1); }
  75% { opacity: 1; transform: rotate(270deg) scale(1.1); }
`;

// Button variants
const getVariantStyles = (variant: string) => {
  switch (variant) {
    case 'primary':
      return css`
        background: linear-gradient(
          135deg,
          ${GALAXY_SWAN_COLORS.primary.main} 0%,
          ${GALAXY_SWAN_COLORS.secondary.main} 50%,
          ${GALAXY_SWAN_COLORS.primary.blue} 100%
        );
        border: 2px solid ${GALAXY_SWAN_COLORS.primary.light};
        color: ${GALAXY_SWAN_COLORS.neutral.white};
        
        &:hover {
          background: linear-gradient(
            135deg,
            ${GALAXY_SWAN_COLORS.primary.light} 0%,
            ${GALAXY_SWAN_COLORS.secondary.light} 50%,
            ${GALAXY_SWAN_COLORS.primary.main} 100%
          );
          border-color: ${GALAXY_SWAN_COLORS.accent.gold};
        }
      `;
    case 'secondary':
      return css`
        background: linear-gradient(
          135deg,
          ${GALAXY_SWAN_COLORS.secondary.main} 0%,
          ${GALAXY_SWAN_COLORS.accent.cosmic} 50%,
          ${GALAXY_SWAN_COLORS.secondary.dark} 100%
        );
        border: 2px solid ${GALAXY_SWAN_COLORS.secondary.light};
        color: ${GALAXY_SWAN_COLORS.neutral.white};
        
        &:hover {
          background: linear-gradient(
            135deg,
            ${GALAXY_SWAN_COLORS.secondary.light} 0%,
            ${GALAXY_SWAN_COLORS.accent.cosmic} 50%,
            ${GALAXY_SWAN_COLORS.secondary.main} 100%
          );
          border-color: ${GALAXY_SWAN_COLORS.accent.gold};
        }
      `;
    case 'success':
      return css`
        background: linear-gradient(
          135deg,
          ${GALAXY_SWAN_COLORS.accent.plasma} 0%,
          ${GALAXY_SWAN_COLORS.primary.main} 50%,
          ${GALAXY_SWAN_COLORS.accent.plasma} 100%
        );
        border: 2px solid ${GALAXY_SWAN_COLORS.accent.plasma};
        color: ${GALAXY_SWAN_COLORS.neutral.black};
        
        &:hover {
          background: linear-gradient(
            135deg,
            #00FFAA 0%,
            ${GALAXY_SWAN_COLORS.primary.light} 50%,
            #00FFAA 100%
          );
          border-color: ${GALAXY_SWAN_COLORS.accent.gold};
          color: ${GALAXY_SWAN_COLORS.neutral.black};
        }
      `;
    case 'warning':
      return css`
        background: linear-gradient(
          135deg,
          ${GALAXY_SWAN_COLORS.accent.gold} 0%,
          ${GALAXY_SWAN_COLORS.accent.ruby} 50%,
          ${GALAXY_SWAN_COLORS.accent.gold} 100%
        );
        border: 2px solid ${GALAXY_SWAN_COLORS.accent.gold};
        color: ${GALAXY_SWAN_COLORS.neutral.black};
        
        &:hover {
          background: linear-gradient(
            135deg,
            #FFE55C 0%,
            #FF6B8A 50%,
            #FFE55C 100%
          );
          border-color: ${GALAXY_SWAN_COLORS.primary.main};
          color: ${GALAXY_SWAN_COLORS.neutral.black};
        }
      `;
    case 'info':
      return css`
        background: linear-gradient(
          135deg,
          ${GALAXY_SWAN_COLORS.primary.blue} 0%,
          ${GALAXY_SWAN_COLORS.primary.main} 50%,
          ${GALAXY_SWAN_COLORS.secondary.main} 100%
        );
        border: 2px solid ${GALAXY_SWAN_COLORS.primary.main};
        color: ${GALAXY_SWAN_COLORS.neutral.white};
        
        &:hover {
          background: linear-gradient(
            135deg,
            ${GALAXY_SWAN_COLORS.primary.main} 0%,
            ${GALAXY_SWAN_COLORS.primary.light} 50%,
            ${GALAXY_SWAN_COLORS.secondary.light} 100%
          );
          border-color: ${GALAXY_SWAN_COLORS.accent.gold};
        }
      `;
    default:
      return css`
        background: linear-gradient(
          135deg,
          ${GALAXY_SWAN_COLORS.primary.main} 0%,
          ${GALAXY_SWAN_COLORS.secondary.main} 100%
        );
        border: 2px solid ${GALAXY_SWAN_COLORS.primary.main};
        color: ${GALAXY_SWAN_COLORS.neutral.white};
      `;
  }
};

const getSizeStyles = (size: string) => {
  switch (size) {
    case 'small':
      return css`
        padding: 0.75rem 1.5rem;
        font-size: 0.9rem;
        min-height: 44px;
      `;
    case 'medium':
      return css`
        padding: 1rem 2rem;
        font-size: 1rem;
        min-height: 48px;
      `;
    case 'large':
      return css`
        padding: 1.25rem 2.5rem;
        font-size: 1.1rem;
        min-height: 52px;
      `;
    case 'xlarge':
      return css`
        padding: 1.5rem 3rem;
        font-size: 1.3rem;
        min-height: 60px;
      `;
    default:
      return css`
        padding: 1rem 2rem;
        font-size: 1rem;
        min-height: 48px;
      `;
  }
};

interface SwanGalaxyLuxuryButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  disabled?: boolean;
  loading?: boolean;
  glowIntensity?: 'low' | 'medium' | 'high' | 'ultra';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
  'aria-busy'?: boolean;
}

const LuxuryButtonContainer = styled(motion.button)<{
  $variant: string;
  $size: string;
  $disabled: boolean;
  $glowIntensity: string;
}>`
  position: relative;
  border: none;
  border-radius: 25px;
  font-weight: 700;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  cursor: pointer;
  outline: none;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  
  ${props => getVariantStyles(props.$variant)}
  ${props => getSizeStyles(props.$size)}
  
  ${props => props.$disabled && css`
    opacity: 0.6;
    cursor: not-allowed;
    filter: grayscale(0.3);
    
    &:hover {
      transform: none;
      box-shadow: none;
      border-color: inherit;
      background: inherit;
    }
  `}
  
  ${props => !props.$disabled && css`
    &:hover {
      transform: translateY(-2px) scale(1.02);
      animation: ${luxuryGlow} 2s ease-in-out infinite;
      
      &::before {
        animation: ${luxuryShimmer} 1.5s ease-in-out infinite;
      }
      
      &::after {
        animation: ${diamondSparkle} 2s ease-in-out infinite;
      }
    }
    
    &:active {
      transform: translateY(0px) scale(0.98);
      transition: transform 0.1s ease;
    }
  `}
  
  /* Luxury shimmer overlay */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 100%
    );
    transition: left 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1;
  }
  
  /* Diamond sparkle effect */
  &::after {
    content: '✦';
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    font-size: 0.8rem;
    color: ${GALAXY_SWAN_COLORS.accent.gold};
    opacity: 0.7;
    z-index: 2;
    filter: drop-shadow(0 0 4px ${GALAXY_SWAN_COLORS.accent.gold});
  }
  
  ${props => props.$glowIntensity === 'ultra' && css`
    box-shadow: 
      0 0 30px rgba(0, 255, 255, 0.6),
      0 0 60px rgba(120, 81, 169, 0.4),
      0 0 90px rgba(255, 215, 0, 0.3);
  `}
  
  ${props => props.$glowIntensity === 'high' && css`
    box-shadow: 
      0 0 20px rgba(0, 255, 255, 0.5),
      0 0 40px rgba(120, 81, 169, 0.3);
  `}
  
  ${props => props.$glowIntensity === 'medium' && css`
    box-shadow: 
      0 0 15px rgba(0, 255, 255, 0.4),
      0 0 30px rgba(120, 81, 169, 0.2);
  `}
`;

const ButtonContent = styled.span`
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const LoadingSpinner = styled.div`
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const SwanIcon = styled.img`
  width: 20px;
  height: 20px;
  filter: brightness(0) invert(1);
  transition: all 0.3s ease;
`;

export const SwanGalaxyLuxuryButton: React.FC<SwanGalaxyLuxuryButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  glowIntensity = 'medium',
  onClick,
  style,
  className,
  type = 'button',
  'aria-label': ariaLabel,
  'aria-busy': ariaBusy,
  ...props
}) => {
  const buttonMotionProps = {
    whileHover: disabled ? {} : {
      scale: 1.02,
      transition: { type: "spring", stiffness: 400, damping: 10 }
    },
    whileTap: disabled ? {} : {
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  return (
    <LuxuryButtonContainer
      $variant={variant}
      $size={size}
      $disabled={disabled || loading}
      $glowIntensity={glowIntensity}
      onClick={disabled || loading ? undefined : onClick}
      style={style}
      className={className}
      type={type}
      aria-label={ariaLabel}
      aria-busy={ariaBusy || loading}
      disabled={disabled || loading}
      {...buttonMotionProps}
      {...props}
    >
      <ButtonContent>
        {loading && <LoadingSpinner />}
        <SwanIcon src="/Logo.png" alt="" />
        {children}
        <SwanIcon src="/Logo.png" alt="" />
      </ButtonContent>
    </LuxuryButtonContainer>
  );
};

export default SwanGalaxyLuxuryButton;