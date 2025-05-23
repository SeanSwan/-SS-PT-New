import React, { ButtonHTMLAttributes } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

// Define the keyframes for the glow animation
const glowAnimation = keyframes`
  0% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(120, 81, 169, 0.3); }
  50% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(120, 81, 169, 0.5); }
  100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(120, 81, 169, 0.3); }
`;

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

// Available color schemes for the button
export type GlowButtonColorScheme = 
  | 'blue' // Blue to purple gradient (default)
  | 'purple' // Purple to pink gradient
  | 'cyan' // Cyan to blue gradient
  | 'green' // Green to blue gradient
  | 'amber' // Amber to orange gradient
  | 'red'; // Red to purple gradient

// Button size options
export type GlowButtonSize = 'small' | 'medium' | 'large' | 'full';

// Props interface for the GlowButton
export interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  colorScheme?: GlowButtonColorScheme;
  size?: GlowButtonSize;
  animated?: boolean;
  glowIntensity?: 'subtle' | 'medium' | 'strong';
  children: React.ReactNode;
  variant?: 'solid' | 'outline' | 'ghost';
  rounded?: boolean;
  icon?: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
}

// Get gradient based on color scheme
const getGradient = (colorScheme: GlowButtonColorScheme): string => {
  switch (colorScheme) {
    case 'blue':
      return 'linear-gradient(90deg, rgba(0, 255, 255, 0.8), rgba(120, 81, 169, 0.8))';
    case 'purple':
      return 'linear-gradient(90deg, rgba(120, 81, 169, 0.8), rgba(233, 30, 99, 0.8))';
    case 'cyan':
      return 'linear-gradient(90deg, rgba(0, 255, 255, 0.8), rgba(33, 150, 243, 0.8))';
    case 'green':
      return 'linear-gradient(90deg, rgba(0, 230, 118, 0.8), rgba(0, 188, 212, 0.8))';
    case 'amber':
      return 'linear-gradient(90deg, rgba(255, 193, 7, 0.8), rgba(255, 87, 34, 0.8))';
    case 'red':
      return 'linear-gradient(90deg, rgba(244, 67, 54, 0.8), rgba(156, 39, 176, 0.8))';
    default:
      return 'linear-gradient(90deg, rgba(0, 255, 255, 0.8), rgba(120, 81, 169, 0.8))';
  }
};

// Get glow shadows based on color scheme and intensity
const getGlowShadow = (colorScheme: GlowButtonColorScheme, intensity: GlowButtonProps['glowIntensity']): string => {
  let intensityFactor = 1;
  if (intensity === 'medium') intensityFactor = 1.5;
  if (intensity === 'strong') intensityFactor = 2;

  const baseColorMap: Record<GlowButtonColorScheme, string> = {
    blue: 'rgba(0, 255, 255',
    purple: 'rgba(120, 81, 169',
    cyan: 'rgba(0, 255, 255',
    green: 'rgba(0, 230, 118',
    amber: 'rgba(255, 193, 7',
    red: 'rgba(244, 67, 54'
  };

  const secondaryColorMap: Record<GlowButtonColorScheme, string> = {
    blue: 'rgba(120, 81, 169',
    purple: 'rgba(233, 30, 99',
    cyan: 'rgba(33, 150, 243',
    green: 'rgba(0, 188, 212',
    amber: 'rgba(255, 87, 34',
    red: 'rgba(156, 39, 176'
  };

  const baseColor = baseColorMap[colorScheme] || baseColorMap.blue;
  const secondaryColor = secondaryColorMap[colorScheme] || secondaryColorMap.blue;

  return `0 0 ${5 * intensityFactor}px ${baseColor}, 0.5), 0 0 ${10 * intensityFactor}px ${secondaryColor}, 0.3)`;
};

// Get size styles
const getSizeStyles = (size: GlowButtonSize): string => {
  switch (size) {
    case 'small':
      return `
        padding: 0.5rem 1rem;
        font-size: 0.85rem;
      `;
    case 'medium':
      return `
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
      `;
    case 'large':
      return `
        padding: 1rem 2rem;
        font-size: 1.1rem;
      `;
    case 'full':
      return `
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        width: 100%;
      `;
    default:
      return `
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
      `;
  }
};

// Get variant styles
const getVariantStyles = (
  variant: GlowButtonProps['variant'],
  colorScheme: GlowButtonColorScheme
): string => {
  const gradient = getGradient(colorScheme);
  
  switch (variant) {
    case 'outline':
      return `
        background: transparent;
        border: 2px solid;
        border-image: ${gradient};
        border-image-slice: 1;
        color: white;
        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `;
    case 'ghost':
      return `
        background: transparent;
        border: none;
        color: white;
        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `;
    case 'solid':
    default:
      return `
        background: ${gradient};
        background-size: 200% auto;
        border: none;
        color: rgba(0, 0, 0, 0.9);
        font-weight: 600;
        &:hover {
          background-position: right center;
        }
      `;
  }
};

// Styled Button component
const StyledButton = styled(motion.button)<{
  $colorScheme: GlowButtonColorScheme;
  $size: GlowButtonSize;
  $glowIntensity: GlowButtonProps['glowIntensity'];
  $variant: GlowButtonProps['variant'];
  $rounded: boolean;
  $isLoading: boolean;
  $animated: boolean;
}>`
  ${({ $size }) => getSizeStyles($size)}
  ${({ $variant, $colorScheme }) => getVariantStyles($variant, $colorScheme)}
  
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: ${({ $rounded }) => ($rounded ? '9999px' : '8px')};
  cursor: ${({ $isLoading }) => ($isLoading ? 'not-allowed' : 'pointer')};
  transition: all 0.3s ease;
  text-decoration: none;
  letter-spacing: 0.5px;
  overflow: hidden;
  box-shadow: ${({ $colorScheme, $glowIntensity }) =>
    getGlowShadow($colorScheme, $glowIntensity)};
  
  /* Animation effect */
  animation: ${({ $animated }) =>
    $animated ? `${glowAnimation} 3s infinite` : 'none'};
  
  /* Hover effect */
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ $colorScheme, $glowIntensity }) => {
      const intensityFactor = $glowIntensity === 'subtle' ? 1 : $glowIntensity === 'medium' ? 1.5 : 2;
      const baseColorMap: Record<GlowButtonColorScheme, string> = {
        blue: 'rgba(0, 255, 255',
        purple: 'rgba(120, 81, 169',
        cyan: 'rgba(0, 255, 255',
        green: 'rgba(0, 230, 118',
        amber: 'rgba(255, 193, 7',
        red: 'rgba(244, 67, 54'
      };
      const secondaryColorMap: Record<GlowButtonColorScheme, string> = {
        blue: 'rgba(120, 81, 169',
        purple: 'rgba(233, 30, 99',
        cyan: 'rgba(33, 150, 243',
        green: 'rgba(0, 188, 212',
        amber: 'rgba(255, 87, 34',
        red: 'rgba(156, 39, 176'
      };
      const baseColor = baseColorMap[$colorScheme] || baseColorMap.blue;
      const secondaryColor = secondaryColorMap[$colorScheme] || secondaryColorMap.blue;
      return `0 0 ${8 * intensityFactor}px ${baseColor}, 0.7), 0 0 ${15 * intensityFactor}px ${secondaryColor}, 0.5)`;
    }};
  }
  
  /* Active/pressed effect */
  &:active {
    transform: translateY(1px);
  }
  
  /* Shimmer effect */
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.2) 50%,
      transparent 100%
    );
    background-size: 200% auto;
    transition: all 0.3s ease;
  }
  
  &:hover:before {
    left: 100%;
  }
  
  /* Disabled state */
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    background-position: 0% 0%;
    box-shadow: none;
    
    &:hover:before {
      left: -100%;
    }
  }
`;

// Loading spinner component
const LoadingSpinner = styled.div`
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
  margin-right: 0.5rem;
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// GlowButton component
const GlowButton: React.FC<GlowButtonProps> = ({
  colorScheme = 'blue',
  size = 'medium',
  animated = false,
  glowIntensity = 'medium',
  variant = 'solid',
  rounded = false,
  icon,
  isLoading = false,
  loadingText,
  children,
  ...props
}) => {
  return (
    <StyledButton
      $colorScheme={colorScheme}
      $size={size}
      $animated={animated}
      $glowIntensity={glowIntensity}
      $variant={variant}
      $rounded={rounded}
      $isLoading={isLoading}
      disabled={isLoading || props.disabled}
      whileHover={{ scale: isLoading || props.disabled ? 1 : 1.03 }}
      whileTap={{ scale: isLoading || props.disabled ? 1 : 0.98 }}
      {...props}
    >
      {isLoading && <LoadingSpinner />}
      {icon && !isLoading && <span className="button-icon">{icon}</span>}
      {isLoading && loadingText ? loadingText : children}
    </StyledButton>
  );
};

export default GlowButton;
