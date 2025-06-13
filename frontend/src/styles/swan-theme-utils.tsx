/**
 * swan-theme-utils.ts
 * Styled Components utilities for the Galaxy-Swan theme integration
 * Provides easy-to-use helpers for applying the enhanced theme throughout the platform
 * 
 * REFACTORED: Uses existing GlowButton component as the primary button system
 * COLOR HIERARCHY: Blue (PRIMARY), Purple (SECONDARY)
 */

import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { galaxySwanTheme, mediaQueries } from './galaxy-swan-theme';
import GlowButton from '../components/ui/buttons/GlowButton';

// === ENHANCED KEYFRAME ANIMATIONS ===

// Swan-inspired elegant animations with PRIMARY colors
export const swanGlide = keyframes`
  0% { 
    transform: translateY(0px); 
    filter: drop-shadow(0 0 5px ${galaxySwanTheme.primary.main}); 
  }
  50% { 
    transform: translateY(-8px); 
    filter: drop-shadow(0 0 15px ${galaxySwanTheme.primary.main}); 
  }
  100% { 
    transform: translateY(0px); 
    filter: drop-shadow(0 0 5px ${galaxySwanTheme.primary.main}); 
  }
`;

// Galaxy-Swan shimmer effect with PRIMARY colors
export const galaxySwanShimmer = keyframes`
  0% { 
    background-position: -200% 0; 
    opacity: 0.8;
  }
  50% {
    background-position: 0% 0;
    opacity: 1;
  }
  100% { 
    background-position: 200% 0; 
    opacity: 0.8;
  }
`;

// Elegant glow effect combining Swan and Galaxy elements with PRIMARY focus
export const elegantGlow = keyframes`
  0%, 100% { 
    text-shadow: 
      0 0 5px ${galaxySwanTheme.primary.main},
      0 0 10px ${galaxySwanTheme.secondary.main},
      0 0 15px ${galaxySwanTheme.primary.main};
  }
  50% { 
    text-shadow: 
      0 0 10px ${galaxySwanTheme.primary.main},
      0 0 15px ${galaxySwanTheme.secondary.main},
      0 0 25px ${galaxySwanTheme.primary.main};
  }
`;

// === RESPONSIVE ANIMATION MIXINS ===

// Animation with performance fallbacks
export const responsiveAnimation = (
  standardAnimation: string,
  reducedAnimation: string = 'none'
) => css`
  animation: ${standardAnimation};
  
  @media (prefers-reduced-motion: reduce) {
    animation: ${reducedAnimation};
  }
`;

// Hover effects with accessibility considerations using PRIMARY colors
export const accessibleHover = (hoverStyles: any) => css`
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    ${hoverStyles}
  }
  
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    
    &:hover {
      transform: none;
      animation: none;
    }
  }
`;

// === THEME-BASED STYLED COMPONENTS ===

// Enhanced container with Galaxy-Swan theming
export const SwanContainer = styled.div<{ variant?: 'primary' | 'secondary' | 'elevated' }>`
  background: ${props => {
    switch (props.variant) {
      case 'elevated': return galaxySwanTheme.background.elevated;
      case 'secondary': return galaxySwanTheme.background.secondary;
      default: return galaxySwanTheme.background.primary;
    }
  }};
  border: ${galaxySwanTheme.borders.elegant};
  border-radius: 15px;
  backdrop-filter: blur(15px);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${galaxySwanTheme.gradients.swanCosmic};
    opacity: 0.05;
    pointer-events: none;
    z-index: 0;
  }
  
  & > * {
    position: relative;
    z-index: 1;
  }
`;

// Swan-themed heading with elegant glow using PRIMARY colors
export const SwanHeading = styled.h1<{ level?: 1 | 2 | 3 | 4 }>`
  color: ${galaxySwanTheme.text.primary};
  font-weight: ${props => props.level === 1 ? 300 : 400};
  font-size: ${props => {
    switch (props.level) {
      case 1: return '3.2rem';
      case 2: return '2.5rem';
      case 3: return '2rem';
      case 4: return '1.5rem';
      default: return '3.2rem';
    }
  }};
  text-align: center;
  margin-bottom: 1.5rem;
  
  animation: ${elegantGlow} 4s ease-in-out infinite;
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
  
  @media (max-width: 480px) {
    font-size: ${props => {
      switch (props.level) {
        case 1: return '2.5rem';
        case 2: return '2rem';
        case 3: return '1.75rem';
        case 4: return '1.25rem';
        default: return '2.5rem';
      }
    }};
  }
`;

// Galaxy-Swan gradient text effect with PRIMARY focus
export const GalaxySwanText = styled.span`
  background: linear-gradient(
    to right, 
    ${galaxySwanTheme.primary.starlight}, 
    ${galaxySwanTheme.primary.main}, 
    ${galaxySwanTheme.secondary.main}, 
    ${galaxySwanTheme.secondary.pink}, 
    ${galaxySwanTheme.primary.starlight}
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  
  animation: ${galaxySwanShimmer} 3s linear infinite;
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
  
  display: inline-block;
  padding: 0 2px;
`;

// Card component with Galaxy-Swan styling
export const SwanCard = styled.div<{ interactive?: boolean }>`
  background: ${galaxySwanTheme.components.card.background};
  border: ${galaxySwanTheme.components.card.border};
  border-radius: 15px;
  padding: 1.5rem;
  backdrop-filter: blur(15px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  
  ${props => props.interactive && css`
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:hover {
      transform: translateY(-8px) scale(1.02);
      border-color: ${galaxySwanTheme.components.card.hoverBorder};
      background: ${galaxySwanTheme.components.card.hoverBackground};
      box-shadow: ${galaxySwanTheme.shadows.swanCosmic};
    }
    
    @media (prefers-reduced-motion: reduce) {
      transition: none;
      
      &:hover {
        transform: none;
        animation: none;
      }
    }
  `}
  
  @media (max-width: 480px) {
    padding: 1.25rem;
    border-radius: 12px;
  }
`;

// === TYPESCRIPT INTERFACES ===

interface ThemedGlowButtonProps {
  variant?: 'primary' | 'secondary' | 'blue' | 'cyan' | 'main' | 'purple' | 'emerald' | 'green' | 'ruby' | 'red' | 'cosmic' | 'accent';
  size?: 'small' | 'medium' | 'large';
  text?: string;
  children?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any; // For additional props
}

// === GLOW BUTTON WRAPPER ===

/**
 * Enhanced GlowButton wrapper that uses the Galaxy-Swan theme
 * This replaces the old SwanButton and uses the existing GlowButton component
 * with the new theme system
 * 
 * COLOR HIERARCHY: Blue (PRIMARY), Purple (SECONDARY)
 */
export const ThemedGlowButton: React.FC<ThemedGlowButtonProps> = ({
  variant = 'primary', // Default to PRIMARY (blue/cyan)
  size = 'medium',
  text,
  children, // Support children as well as text
  onClick,
  disabled = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  style = {},
  ...props
}) => {
  // Get the appropriate theme based on variant
  const getThemeForVariant = (variant: string) => {
    switch (variant) {
      case 'primary':
      case 'blue':
      case 'cyan':
      case 'main':
        return 'primary'; // Use our PRIMARY blue/cyan theme
      case 'secondary':
      case 'purple':
        return 'purple'; // Use SECONDARY purple theme
      case 'emerald':
      case 'green':
        return 'emerald';
      case 'ruby':
      case 'red':
        return 'ruby';
      case 'cosmic':
        return 'cosmic';
      case 'accent': // Accent uses PRIMARY
        return 'primary';
      default:
        return 'primary'; // Default to PRIMARY (blue/cyan)
    }
  };

  const glowButtonTheme = getThemeForVariant(variant);
  
  // Use text prop or children, prioritizing text if both are provided
  const buttonContent = text || children;

  return (
    <GlowButton
      text={buttonContent}
      theme={glowButtonTheme}
      size={size}
      onClick={onClick}
      disabled={disabled}
      isLoading={isLoading}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      className={className}
      style={style}
      {...props}
    />
  );
};

// === UTILITY MIXINS ===

// Glassmorphism effect with Swan-Galaxy colors using PRIMARY
export const glassMorphism = css`
  background: rgba(30, 30, 60, 0.4);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
`;

// Text gradient with Galaxy-Swan colors emphasizing PRIMARY
export const textGradient = (colors: string[] = [
  '#00FFFF',
  '#00A0E3',
  '#7851A9'
]) => css`
  background: linear-gradient(to right, ${colors.join(', ')});
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
`;

// Responsive glow effect using PRIMARY colors
export const responsiveGlow = (color: string = '#00FFFF') => css`
  filter: drop-shadow(0 0 10px ${color}33);
  
  @media (prefers-reduced-motion: reduce) {
    filter: none;
  }
`;

// === THEME PROVIDER HELPERS ===

// Function to get theme-appropriate spacing
export const getSpacing = (multiplier: number = 1): string => {
  return `${0.5 * multiplier}rem`;
};

// Function to get responsive font size
export const getResponsiveFontSize = (baseSize: string) => css`
  font-size: ${baseSize};
  
  @media (max-width: 480px) {
    font-size: calc(${baseSize} * 0.875);
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    font-size: calc(${baseSize} * 0.9375);
  }
`;

// === PERFORMANCE OPTIMIZED COMPONENTS ===

// Optimized animated component that respects user preferences
export const OptimizedAnimatedDiv = styled.div<{ shouldAnimate?: boolean }>`
  ${props => props.shouldAnimate ? css`
    animation: ${swanGlide} 6s ease-in-out infinite;
    
    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  ` : ''}
`;

// === BUTTON CONVENIENCE EXPORTS ===

// Export commonly used button variants for easy access
// PRIMARY = Blue/Cyan, SECONDARY = Purple
export const PrimaryButton: React.FC<ThemedGlowButtonProps> = (props) => <ThemedGlowButton {...props} variant="primary" />;
export const SecondaryButton: React.FC<ThemedGlowButtonProps> = (props) => <ThemedGlowButton {...props} variant="secondary" />;
export const AccentButton: React.FC<ThemedGlowButtonProps> = (props) => <ThemedGlowButton {...props} variant="primary" />; // PRIMARY is our accent
export const BlueButton: React.FC<ThemedGlowButtonProps> = (props) => <ThemedGlowButton {...props} variant="primary" />; // Explicit blue
export const PurpleButton: React.FC<ThemedGlowButtonProps> = (props) => <ThemedGlowButton {...props} variant="secondary" />; // Explicit purple

// Legacy alias for compatibility - points to ThemedGlowButton with PRIMARY default
export const SwanButton = ThemedGlowButton;

export {
  galaxySwanTheme,
  mediaQueries,
  GlowButton // Re-export the original component
};