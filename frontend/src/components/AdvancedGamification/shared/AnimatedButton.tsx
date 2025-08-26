/**
 * ⚡ ANIMATED BUTTON - INTERACTIVE BUTTON COMPONENT
 * =================================================
 * Reusable button component with animations, states, and effects
 * for gamification actions with Galaxy-Swan theme integration
 */

import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion, HTMLMotionProps } from 'framer-motion';

// ================================================================
// ANIMATION KEYFRAMES
// ================================================================

const rippleEffect = keyframes`
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
`;

const pulseAnimation = keyframes`
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.7);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(0, 255, 255, 0);
  }
`;

const loadingSpinner = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const successAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

const shakeAnimation = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
`;

// ================================================================
// TYPES AND INTERFACES
// ================================================================

export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'ghost' 
  | 'outline'
  | 'gradient'
  | 'premium';

export type ButtonSize = 'small' | 'medium' | 'large' | 'xl';

export interface AnimatedButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  // Visual variants
  variant?: ButtonVariant;
  size?: ButtonSize;
  
  // States
  isLoading?: boolean;
  isDisabled?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  
  // Visual effects
  showRipple?: boolean;
  showPulse?: boolean;
  showGlow?: boolean;
  fullWidth?: boolean;
  rounded?: boolean;
  
  // Icons and content
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  
  // Callbacks
  onSuccess?: () => void;
  onError?: () => void;
  
  // Children
  children: React.ReactNode;
  
  // Custom styling
  customColors?: {
    background?: string;
    backgroundHover?: string;
    text?: string;
    border?: string;
  };
}

// ================================================================
// STYLED COMPONENTS
// ================================================================

const ButtonContainer = styled(motion.button)<{
  variant: ButtonVariant;
  size: ButtonSize;
  $isLoading: boolean;
  $isDisabled: boolean;
  $isSuccess: boolean;
  $isError: boolean;
  $showPulse: boolean;
  $showGlow: boolean;
  $fullWidth: boolean;
  $rounded: boolean;
  $customColors?: AnimatedButtonProps['customColors'];
}>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  border-radius: ${props => props.$rounded ? '50px' : '12px'};
  font-family: inherit;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  user-select: none;
  
  /* Full width */
  ${props => props.$fullWidth && css`
    width: 100%;
  `}
  
  /* Size variants */
  ${({ size }) => {
    switch (size) {
      case 'small':
        return css`
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          min-height: 36px;
        `;
      case 'large':
        return css`
          padding: 0.875rem 2rem;
          font-size: 1.125rem;
          min-height: 48px;
        `;
      case 'xl':
        return css`
          padding: 1rem 2.5rem;
          font-size: 1.25rem;
          min-height: 56px;
        `;
      default: // medium
        return css`
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          min-height: 42px;
        `;
    }
  }}
  
  /* Visual variants */
  ${({ variant, $customColors }) => {
    const colors = $customColors || {};
    
    switch (variant) {
      case 'primary':
        return css`
          background: ${colors.background || 'linear-gradient(135deg, #00ffff 0%, #0080ff 100%)'};
          color: ${colors.text || '#000'};
          border: 1px solid transparent;
          
          &:hover:not(:disabled) {
            background: ${colors.backgroundHover || 'linear-gradient(135deg, #00e6e6 0%, #0073e6 100%)'};
            box-shadow: 0 4px 20px rgba(0, 255, 255, 0.3);
            transform: translateY(-2px);
          }
        `;
      
      case 'secondary':
        return css`
          background: ${colors.background || 'rgba(255, 255, 255, 0.1)'};
          color: ${colors.text || '#ffffff'};
          border: 1px solid ${colors.border || 'rgba(255, 255, 255, 0.2)'};
          backdrop-filter: blur(10px);
          
          &:hover:not(:disabled) {
            background: ${colors.backgroundHover || 'rgba(255, 255, 255, 0.2)'};
            border-color: rgba(255, 255, 255, 0.4);
          }
        `;
      
      case 'success':
        return css`
          background: ${colors.background || 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)'};
          color: ${colors.text || '#000'};
          
          &:hover:not(:disabled) {
            background: ${colors.backgroundHover || 'linear-gradient(135deg, #00e677 0%, #00b35e 100%)'};
          }
        `;
      
      case 'warning':
        return css`
          background: ${colors.background || 'linear-gradient(135deg, #ffd700 0%, #ff8f00 100%)'};
          color: ${colors.text || '#000'};
          
          &:hover:not(:disabled) {
            background: ${colors.backgroundHover || 'linear-gradient(135deg, #ffcd00 0%, #e68000 100%)'};
          }
        `;
      
      case 'danger':
        return css`
          background: ${colors.background || 'linear-gradient(135deg, #ff4757 0%, #ff3742 100%)'};
          color: ${colors.text || '#fff'};
          
          &:hover:not(:disabled) {
            background: ${colors.backgroundHover || 'linear-gradient(135deg, #ff3742 0%, #ff2f3a 100%)'};
          }
        `;
      
      case 'ghost':
        return css`
          background: transparent;
          color: ${colors.text || '#00ffff'};
          border: none;
          
          &:hover:not(:disabled) {
            background: rgba(0, 255, 255, 0.1);
            color: #ffffff;
          }
        `;
      
      case 'outline':
        return css`
          background: transparent;
          color: ${colors.text || '#00ffff'};
          border: 2px solid ${colors.border || '#00ffff'};
          
          &:hover:not(:disabled) {
            background: ${colors.backgroundHover || '#00ffff'};
            color: #000;
          }
        `;
      
      case 'gradient':
        return css`
          background: ${colors.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
          color: ${colors.text || '#fff'};
          
          &:hover:not(:disabled) {
            background: ${colors.backgroundHover || 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'};
          }
        `;
      
      case 'premium':
        return css`
          background: ${colors.background || 'linear-gradient(135deg, #ffd700 0%, #ff8f00 50%, #ff6f00 100%)'};
          color: ${colors.text || '#000'};
          box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
          
          &:hover:not(:disabled) {
            background: ${colors.backgroundHover || 'linear-gradient(135deg, #ffcd00 0%, #e68000 50%, #e65f00 100%)'};
            box-shadow: 0 0 40px rgba(255, 215, 0, 0.5);
          }
        `;
      
      default:
        return css`
          background: ${colors.background || 'linear-gradient(135deg, #00ffff 0%, #0080ff 100%)'};
          color: ${colors.text || '#000'};
        `;
    }
  }}
  
  /* State styles */
  ${({ $isDisabled }) => $isDisabled && css`
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    
    &:hover {
      background: inherit !important;
      box-shadow: inherit !important;
      transform: none !important;
    }
  `}
  
  ${({ $isSuccess }) => $isSuccess && css`
    animation: ${successAnimation} 0.6s ease-out;
  `}
  
  ${({ $isError }) => $isError && css`
    animation: ${shakeAnimation} 0.6s ease-out;
  `}
  
  /* Effects */
  ${({ $showPulse }) => $showPulse && css`
    animation: ${pulseAnimation} 2s infinite;
  `}
  
  ${({ $showGlow }) => $showGlow && css`
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  `}
  
  /* Focus styles */
  &:focus-visible {
    outline: 2px solid #00ffff;
    outline-offset: 2px;
  }
  
  /* Active state */
  &:active:not(:disabled) {
    transform: scale(0.98);
  }
  
  /* Mobile touch optimization */
  @media (max-width: 768px) {
    min-height: 44px; /* iOS minimum touch target */
    
    &:hover {
      transform: none; /* Disable hover effects on touch devices */
    }
  }
`;

const ButtonContent = styled.span<{ $isLoading: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: ${props => props.$isLoading ? 0 : 1};
  transition: opacity 0.3s ease;
`;

const LoadingSpinner = styled.div<{ size: ButtonSize }>`
  position: absolute;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: ${loadingSpinner} 1s linear infinite;
  
  ${({ size }) => {
    switch (size) {
      case 'small':
        return css`
          width: 16px;
          height: 16px;
        `;
      case 'large':
        return css`
          width: 24px;
          height: 24px;
        `;
      case 'xl':
        return css`
          width: 28px;
          height: 28px;
        `;
      default:
        return css`
          width: 20px;
          height: 20px;
        `;
    }
  }}
`;

const RippleContainer = styled.span`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
`;

const Ripple = styled.span<{ x: number; y: number }>`
  position: absolute;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.6);
  width: 10px;
  height: 10px;
  animation: ${rippleEffect} 0.6s ease-out;
  top: ${props => props.y}px;
  left: ${props => props.x}px;
  transform: translate(-50%, -50%);
`;

const IconContainer = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 1em;
    height: 1em;
  }
`;

// ================================================================
// ANIMATION VARIANTS
// ================================================================

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
  loading: { scale: 1 },
  success: { 
    scale: [1, 1.05, 1],
    transition: { duration: 0.6 }
  },
  error: { 
    x: [0, -5, 5, -5, 5, 0],
    transition: { duration: 0.6 }
  }
};

// ================================================================
// MAIN COMPONENT
// ================================================================

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  isDisabled = false,
  isSuccess = false,
  isError = false,
  showRipple = false,
  showPulse = false,
  showGlow = false,
  fullWidth = false,
  rounded = false,
  leftIcon,
  rightIcon,
  loadingText,
  successText,
  errorText,
  onSuccess,
  onError,
  children,
  customColors,
  onClick,
  ...motionProps
}) => {
  
  const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled || isLoading) return;
    
    // Create ripple effect
    if (showRipple) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newRipple = { id: Date.now(), x, y };
      
      setRipples(prev => [...prev, newRipple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
      }, 600);
    }
    
    // Handle success and error callbacks
    if (isSuccess && onSuccess) {
      onSuccess();
    } else if (isError && onError) {
      onError();
    }
    
    // Call original onClick
    if (onClick) {
      onClick(e);
    }
  };
  
  const getButtonText = () => {
    if (isLoading && loadingText) return loadingText;
    if (isSuccess && successText) return successText;
    if (isError && errorText) return errorText;
    return children;
  };
  
  const getCurrentVariant = () => {
    if (isLoading) return 'loading';
    if (isSuccess) return 'success';
    if (isError) return 'error';
    return 'initial';
  };
  
  return (
    <ButtonContainer
      variant={variant}
      size={size}
      $isLoading={isLoading}
      $isDisabled={isDisabled}
      $isSuccess={isSuccess}
      $isError={isError}
      $showPulse={showPulse}
      $showGlow={showGlow}
      $fullWidth={fullWidth}
      $rounded={rounded}
      $customColors={customColors}
      variants={buttonVariants}
      initial="initial"
      animate={getCurrentVariant()}
      whileHover={!isDisabled && !isLoading ? "hover" : undefined}
      whileTap={!isDisabled && !isLoading ? "tap" : undefined}
      onClick={handleClick}
      disabled={isDisabled || isLoading}
      aria-disabled={isDisabled || isLoading}
      aria-busy={isLoading}
      {...motionProps}
    >
      {/* Ripple effects */}
      {showRipple && (
        <RippleContainer>
          {ripples.map(ripple => (
            <Ripple key={ripple.id} x={ripple.x} y={ripple.y} />
          ))}
        </RippleContainer>
      )}
      
      {/* Loading spinner */}
      {isLoading && <LoadingSpinner size={size} />}
      
      {/* Button content */}
      <ButtonContent $isLoading={isLoading}>
        {leftIcon && <IconContainer>{leftIcon}</IconContainer>}
        <span>{getButtonText()}</span>
        {rightIcon && <IconContainer>{rightIcon}</IconContainer>}
      </ButtonContent>
    </ButtonContainer>
  );
};

export default AnimatedButton;
