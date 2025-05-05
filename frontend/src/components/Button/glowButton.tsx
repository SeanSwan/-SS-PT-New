/**
 * GlowButton.tsx
 * 
 * A premium styled button component with glow effects, animations, and different themes.
 * Used throughout the application for a consistent premium look and feel.
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';

// Animation keyframes
const pulse = keyframes`
  0% {
    box-shadow: 0 0 8px 0 rgba(0, 255, 255, 0.4), 0 0 12px 0 rgba(0, 255, 255, 0.2);
  }
  50% {
    box-shadow: 0 0 16px 2px rgba(0, 255, 255, 0.6), 0 0 20px 4px rgba(0, 255, 255, 0.3);
  }
  100% {
    box-shadow: 0 0 8px 0 rgba(0, 255, 255, 0.4), 0 0 12px 0 rgba(0, 255, 255, 0.2);
  }
`;

const cosmicPulse = keyframes`
  0% {
    box-shadow: 0 0 8px 0 rgba(120, 81, 169, 0.4), 0 0 12px 0 rgba(0, 255, 255, 0.2);
  }
  50% {
    box-shadow: 0 0 16px 2px rgba(120, 81, 169, 0.6), 0 0 20px 4px rgba(0, 255, 255, 0.3);
  }
  100% {
    box-shadow: 0 0 8px 0 rgba(120, 81, 169, 0.4), 0 0 12px 0 rgba(0, 255, 255, 0.2);
  }
`;

const warningPulse = keyframes`
  0% {
    box-shadow: 0 0 8px 0 rgba(255, 64, 64, 0.4), 0 0 12px 0 rgba(255, 64, 64, 0.2);
  }
  50% {
    box-shadow: 0 0 16px 2px rgba(255, 64, 64, 0.6), 0 0 20px 4px rgba(255, 64, 64, 0.3);
  }
  100% {
    box-shadow: 0 0 8px 0 rgba(255, 64, 64, 0.4), 0 0 12px 0 rgba(255, 64, 64, 0.2);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

// Define theme variants
const themeVariants = {
  primary: css`
    background: linear-gradient(45deg, #00a8ff, #0097e6);
    color: white;
    
    &:hover {
      background: linear-gradient(45deg, #0097e6, #00a8ff);
    }
    
    &:active {
      background: linear-gradient(45deg, #0088cc, #0088cc);
    }
  `,
  cosmic: css`
    background: linear-gradient(45deg, #00ffff, #7851a9);
    color: #ffffff;
    animation: ${cosmicPulse} 2s infinite ease-in-out;
    
    &:hover {
      background: linear-gradient(45deg, #7851a9, #00ffff);
    }
    
    &:active {
      background: linear-gradient(45deg, #673ab7, #00e5ff);
      animation: none;
    }
  `,
  neon: css`
    background: transparent;
    color: #00ffff;
    border: 2px solid #00ffff;
    animation: ${pulse} 2s infinite ease-in-out;
    
    &:hover {
      background: rgba(0, 255, 255, 0.1);
    }
    
    &:active {
      background: rgba(0, 255, 255, 0.2);
      animation: none;
    }
  `,
  dark: css`
    background: rgba(30, 30, 60, 0.5);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    
    &:hover {
      background: rgba(30, 30, 60, 0.7);
      border-color: rgba(255, 255, 255, 0.3);
    }
    
    &:active {
      background: rgba(20, 20, 40, 0.8);
    }
  `,
  warning: css`
    background: linear-gradient(45deg, #ff4040, #ff6b6b);
    color: white;
    animation: ${warningPulse} 2s infinite ease-in-out;
    
    &:hover {
      background: linear-gradient(45deg, #ff6b6b, #ff4040);
    }
    
    &:active {
      background: linear-gradient(45deg, #ff3333, #ff3333);
      animation: none;
    }
  `,
  gradient: css`
    background: linear-gradient(
      to right,
      #a9f8fb,
      #46cdcf,
      #7b2cbf,
      #c8b6ff,
      #a9f8fb
    );
    background-size: 200% auto;
    color: white;
    animation: ${shimmer} 4s linear infinite;
    
    &:hover {
      animation: ${shimmer} 2s linear infinite;
    }
    
    &:active {
      animation: none;
      background-position: 100% 0;
    }
  `,
};

// Define size variants
const sizeVariants = {
  small: css`
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    border-radius: 6px;
  `,
  medium: css`
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border-radius: 8px;
  `,
  large: css`
    padding: 1rem 2rem;
    font-size: 1.125rem;
    border-radius: 10px;
  `,
};

// Styled button component
const StyledButton = styled(motion.button)<{
  $theme: keyof typeof themeVariants;
  $size: keyof typeof sizeVariants;
  $disabled: boolean;
  $fullWidth: boolean;
}>`
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
  width: ${props => props.$fullWidth ? '100%' : 'auto'};
  
  /* Apply theme variant styles */
  ${props => themeVariants[props.$theme]}
  
  /* Apply size variant styles */
  ${props => sizeVariants[props.$size]}
  
  /* Disabled state */
  ${props => props.$disabled && css`
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
    animation: none;
  `}
  
  /* Focus state */
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.3);
  }
  
  /* Icon alignment */
  .button-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* Loading state */
  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// GlowButton props interface
interface GlowButtonProps {
  text: string;
  onClick?: () => void;
  theme?: keyof typeof themeVariants;
  size?: keyof typeof sizeVariants;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  animateOnRender?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Animation variants for Framer Motion
const buttonVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  tap: { scale: 0.98 },
};

// GlowButton component
const GlowButton: React.FC<GlowButtonProps> = ({
  text,
  onClick,
  theme = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  animateOnRender = false,
  className,
  style,
  ...rest
}) => {
  return (
    <StyledButton
      type={type}
      onClick={onClick}
      $theme={theme}
      $size={size}
      $disabled={disabled || loading}
      $fullWidth={fullWidth}
      className={className}
      style={style}
      initial={animateOnRender ? 'initial' : undefined}
      animate={animateOnRender ? 'animate' : undefined}
      whileTap="tap"
      variants={buttonVariants}
      {...rest}
    >
      {loading ? (
        <div className="loading-spinner" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="button-icon">{icon}</span>}
          {text}
          {icon && iconPosition === 'right' && <span className="button-icon">{icon}</span>}
        </>
      )}
    </StyledButton>
  );
};

export default GlowButton;
