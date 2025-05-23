import React from 'react';
import { Button, ButtonProps } from '@mui/material';
import styled, { keyframes } from 'styled-components';

// Keyframe animations for the glow effect
const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

// Types for the GlowButton props
interface GlowButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
  glowColor?: string;
  glowIntensity?: 'low' | 'medium' | 'high';
  children: React.ReactNode;
}

// Styled Button component with glow effect
const StyledGlowButton = styled(Button)<{
  $variant?: string;
  $glowColor?: string;
  $glowIntensity?: string;
}>`
  background: ${props => {
    switch (props.$variant) {
      case 'secondary':
        return 'linear-gradient(90deg, rgba(120, 81, 169, 0.8), rgba(161, 133, 200, 0.8))';
      case 'success':
        return 'linear-gradient(90deg, rgba(0, 230, 130, 0.8), rgba(0, 179, 101, 0.8))';
      case 'warning':
        return 'linear-gradient(90deg, rgba(255, 183, 0, 0.8), rgba(255, 145, 0, 0.8))';
      case 'info':
        return 'linear-gradient(90deg, rgba(33, 150, 243, 0.8), rgba(3, 127, 225, 0.8))';
      case 'primary':
      default:
        return 'linear-gradient(90deg, rgba(0, 255, 255, 0.8), rgba(120, 81, 169, 0.8))';
    }
  }};
  
  color: white;
  font-weight: 500;
  border: none;
  text-transform: none;
  padding: 0.5rem 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  
  &:hover {
    box-shadow: ${props => {
      const color = props.$glowColor || 
        (props.$variant === 'secondary' ? 'rgba(120, 81, 169, 0.5)' : 
        props.$variant === 'success' ? 'rgba(0, 230, 130, 0.5)' : 
        props.$variant === 'warning' ? 'rgba(255, 183, 0, 0.5)' : 
        props.$variant === 'info' ? 'rgba(33, 150, 243, 0.5)' : 
        'rgba(0, 255, 255, 0.5)');
        
      const intensity = props.$glowIntensity === 'low' ? '0.3' : 
                      props.$glowIntensity === 'high' ? '0.7' : '0.5';
                      
      return `0 0 15px ${color}, 0 0 30px rgba(120, 81, 169, ${intensity})`;
    }};
    transform: translateY(-2px);
  }
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
    transition: all 0.4s ease;
  }
  
  &:hover:before {
    left: 100%;
  }
  
  &:disabled {
    background: rgba(30, 30, 60, 0.5);
    color: rgba(255, 255, 255, 0.4);
    box-shadow: none;
    
    &:before {
      display: none;
    }
  }
`;

/**
 * GlowButton Component
 * 
 * A customized Material-UI Button with a glowing effect for the Swan Studios application.
 * This component is designed to match the futuristic, dark theme of the application.
 * 
 * @param variant - The color variant of the button (primary, secondary, success, warning, info)
 * @param glowColor - Optional custom color for the glow effect (CSS color string)
 * @param glowIntensity - Intensity of the glow effect (low, medium, high)
 * @param children - The content of the button
 * @param props - Any other props to pass to the Button component
 */
const GlowButton: React.FC<GlowButtonProps> = ({
  variant = 'primary',
  glowColor,
  glowIntensity = 'medium',
  children,
  ...props
}) => {
  return (
    <StyledGlowButton
      $variant={variant}
      $glowColor={glowColor}
      $glowIntensity={glowIntensity}
      {...props}
    >
      {children}
    </StyledGlowButton>
  );
};

export default GlowButton;