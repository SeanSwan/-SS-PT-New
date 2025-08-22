import React, { useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { motion } from "framer-motion";

// TypeScript interfaces for better type safety
export interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  variant?: GlowButtonColorScheme;
  size?: GlowButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  animateOnRender?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  startIcon?: React.ReactNode; // Alias for leftIcon
  endIcon?: React.ReactNode; // Alias for rightIcon
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  fullWidth?: boolean;
  glowIntensity?: 'low' | 'medium' | 'high';
}

export type GlowButtonColorScheme = 'primary' | 'neonBlue' | 'purple' | 'emerald' | 'ruby' | 'cosmic';
export type GlowButtonSize = 'small' | 'medium' | 'large';

interface ButtonTheme {
  background: string;
  color: string;
  shadow: string;
  shineLeft: string;
  shineRight: string;
  glowStart: string;
  glowEnd: string;
}

interface ButtonSize {
  fontSize: string;
  padding: string;
  width: string;
  height: string;
  borderRadius: string;
}

// Button theme options with different color schemes
const BUTTON_THEMES: Record<GlowButtonColorScheme, ButtonTheme> = {
  // PRIMARY theme (Blue/Cyan) - Galaxy-Swan primary
  primary: {
    background: "#041e2e", // Dark blue base
    color: "#fff",
    shadow: "rgba(4, 64, 104, 0.2)",
    shineLeft: "rgba(0, 160, 227, 0.5)", // swanBlue
    shineRight: "rgba(0, 255, 255, 0.65)", // swanCyan
    glowStart: "#00A0E3", // swanBlue
    glowEnd: "#00FFFF", // swanCyan
  },
  // NEON BLUE theme - Bright electric blue
  neonBlue: {
    background: "#001122", // Very dark blue base
    color: "#fff",
    shadow: "rgba(0, 136, 255, 0.3)",
    shineLeft: "rgba(0, 136, 255, 0.6)", // Electric blue
    shineRight: "rgba(0, 200, 255, 0.8)", // Bright cyan
    glowStart: "#0088FF", // Electric blue
    glowEnd: "#00C8FF", // Bright cyan
  },
  // SECONDARY theme (Purple) - Galaxy-Swan secondary
  purple: {
    background: "#09041e",
    color: "#fff",
    shadow: "rgba(33, 4, 104, 0.2)",
    shineLeft: "rgba(120, 0, 245, 0.5)",
    shineRight: "rgba(200, 148, 255, 0.65)",
    glowStart: "#B000E8",
    glowEnd: "#009FFD",
  },
  emerald: {
    background: "#0c1e0e",
    color: "#fff",
    shadow: "rgba(4, 104, 49, 0.2)",
    shineLeft: "rgba(0, 245, 111, 0.5)",
    shineRight: "rgba(148, 255, 200, 0.65)",
    glowStart: "#00E8B0",
    glowEnd: "#00FD9F",
  },
  ruby: {
    background: "#1e040c",
    color: "#fff",
    shadow: "rgba(104, 4, 33, 0.2)",
    shineLeft: "rgba(245, 0, 90, 0.5)",
    shineRight: "rgba(255, 148, 180, 0.65)",
    glowStart: "#E80046",
    glowEnd: "#FD009F",
  },
  cosmic: {
    background: "#0a0a18",
    color: "#fff",
    shadow: "rgba(10, 10, 40, 0.3)",
    shineLeft: "rgba(86, 11, 173, 0.5)",
    shineRight: "rgba(255, 255, 255, 0.65)",
    glowStart: "#5D3FD3",
    glowEnd: "#FF2E63",
  }
};

// Button sizes
const BUTTON_SIZES: Record<GlowButtonSize, ButtonSize> = {
  small: {
    fontSize: "14px",
    padding: "8px 16px",
    width: "100px",
    height: "36px",
    borderRadius: "8px",
  },
  medium: {
    fontSize: "16px",
    padding: "10px 20px",
    width: "140px",
    height: "44px",
    borderRadius: "11px",
  },
  large: {
    fontSize: "18px",
    padding: "12px 24px",
    width: "160px",
    height: "52px",
    borderRadius: "14px",
  },
};

// Animation keyframes
const rotate = keyframes`
  to {
    transform: scale(1.05) translateY(-44px) rotate(360deg) translateZ(0);
  }
`;

const pulse = keyframes`
  0% { opacity: 0.85; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.02); }
  100% { opacity: 0.85; transform: scale(1); }
`;

const ripple = keyframes`
  0% { transform: scale(0); opacity: 1; }
  80% { transform: scale(2); opacity: 0.3; }
  100% { transform: scale(2.5); opacity: 0; }
`;

// Convert button variables to CSS vars
const generateButtonVars = (theme: ButtonTheme, size: ButtonSize, fullWidth?: boolean, glowIntensity?: string) => css`
  --button-background: ${theme.background};
  --button-color: ${theme.color};
  --button-shadow: ${theme.shadow};
  --button-shine-left: ${theme.shineLeft};
  --button-shine-right: ${theme.shineRight};
  --button-glow-start: ${theme.glowStart};
  --button-glow-end: ${theme.glowEnd};
  --pointer-x: 0px;
  --pointer-y: 0px;
  --button-glow: transparent;
  --button-glow-opacity: ${glowIntensity === 'high' ? '1.2' : glowIntensity === 'low' ? '0.6' : '1'};
  --button-glow-duration: 0.5s;
  --button-font-size: ${size.fontSize};
  --button-padding: ${size.padding};
  --button-width: ${fullWidth ? '100%' : size.width};
  --button-height: ${size.height};
  --button-border-radius: ${size.borderRadius};
`;

// Main button container
const ButtonContainer = styled.div<{ fullWidth?: boolean }>`
  display: inline-block;
  position: relative;
  transition: transform 0.2s ease;
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  
  &:active {
    transform: translateY(2px) scale(0.98);
  }
`;

interface StyledButtonProps {
  $theme: ButtonTheme;
  $size: ButtonSize;
  $fullWidth?: boolean;
  $glowIntensity?: string;
}

// StyledGlowButton with proper prop filtering
const StyledGlowButton = styled.button.withConfig({
  shouldForwardProp: (prop) => {
    // These are props we don't want to pass to the HTML button element
    const nonDOMProps = [
      '$theme', '$size', '$fullWidth', '$glowIntensity', 'isAnimating', 'variant', 
      'startIcon', 'endIcon', 'leftIcon', 'rightIcon', // Icon props
      'animateOnRender', 'isLoading', // State props
      'text', 'glowIntensity' // Content prop
    ];
    return !nonDOMProps.includes(prop);
  }
})<StyledButtonProps>`
  ${({ $theme, $size, $fullWidth, $glowIntensity }) => generateButtonVars($theme, $size, $fullWidth, $glowIntensity)}
  
  appearance: none;
  outline: none;
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: var(--button-font-size);
  font-weight: 500;
  letter-spacing: 0.5px;
  border-radius: var(--button-border-radius);
  position: relative;
  cursor: pointer;
  color: var(--button-color);
  padding: 0;
  margin: 0;
  background: none;
  z-index: 1;
  box-shadow: 0 8px 20px var(--button-shadow);
  width: var(--button-width);
  height: var(--button-height);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  
  &:hover {
    --button-glow-opacity: 1;
    --button-glow-duration: .25s;
    transform: translateY(-1px);
    box-shadow: 0 10px 25px var(--button-shadow);
  }
  
  &:focus {
    outline: 2px solid var(--button-glow-end);
    outline-offset: 2px;
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    filter: grayscale(40%);
    
    &:hover {
      transform: none;
      box-shadow: 0 8px 20px var(--button-shadow);
    }
  }
`;

// Gradient background effect
const Gradient = styled.div`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  transform: scaleY(1.02) scaleX(1.005) rotate(-.35deg);

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    transform: scale(1.05) translateY(-44px) rotate(0deg) translateZ(0);
    padding-bottom: 100%;
    border-radius: 50%;
    background: linear-gradient(90deg, var(--button-shine-left), var(--button-shine-right));
    animation: ${rotate} linear 2s infinite;
  }
`;

// Button text with glow effect
const ButtonSpan = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== 'isAnimating'
})<{ isAnimating?: boolean }>`
  z-index: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background-color: var(--button-background);
  overflow: hidden;
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  
  ${({ isAnimating }) => isAnimating && css`
    animation: ${pulse} 2s infinite;
  `}

  &:before {
    content: '';
    position: absolute;
    left: -16px;
    top: -16px;
    transform: translate(var(--pointer-x, 0px), var(--pointer-y, 0px)) translateZ(0);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--button-glow, transparent);
    opacity: var(--button-glow-opacity, 0);
    transition: opacity var(--button-glow-duration, .5s), transform 0.6s ease, background-color 0.2s ease;
    filter: blur(20px);
  }
`;

// Click ripple effect
const Ripple = styled.span<{ $x: number; $y: number }>`
  position: absolute;
  top: ${props => props.$y}px;
  left: ${props => props.$x}px;
  width: 20px;
  height: 20px;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  animation: ${ripple} 0.6s linear;
  pointer-events: none;
`;

// Loading spinner
const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// Icon container for prepending or appending icons
const IconContainer = styled.span<{ position: 'left' | 'right' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  ${({ position }) => position === 'left' ? 'margin-right: 8px;' : 'margin-left: 8px;'}
`;

interface RippleData {
  id: number;
  x: number;
  y: number;
}

/**
 * Enhanced GlowButton Component
 * A premium button component with animated glow effects, customizable themes, and accessibility features
 */
const GlowButton: React.FC<GlowButtonProps> = ({
  text,
  children,
  variant = "primary",
  size = "medium",
  isLoading = false,
  disabled = false,
  animateOnRender = false,
  leftIcon,
  rightIcon,
  startIcon,
  endIcon,
  onClick,
  fullWidth = false,
  glowIntensity = 'medium',
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<RippleData[]>([]);
  const [isAnimating, setIsAnimating] = useState(animateOnRender);
  
  // Resolve icon props (support both leftIcon/rightIcon and startIcon/endIcon)
  const resolvedLeftIcon = leftIcon || startIcon;
  const resolvedRightIcon = rightIcon || endIcon;
  
  // Get theme and size configurations
  const buttonTheme = BUTTON_THEMES[variant] || BUTTON_THEMES.primary;
  const buttonSize = BUTTON_SIZES[size] || BUTTON_SIZES.medium;
  
  // Handle cursor tracking for glow effect
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    
    const handlePointerMove = (e: PointerEvent) => {
      if (disabled) return;
      
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Use CSS custom properties instead of GSAP
      button.style.setProperty('--pointer-x', `${x}px`);
      button.style.setProperty('--pointer-y', `${y}px`);
      
      // Simple color interpolation instead of chroma-js
      const progress = x / rect.width;
      const glowColor = progress > 0.5 
        ? getComputedStyle(button).getPropertyValue('--button-glow-end').trim()
        : getComputedStyle(button).getPropertyValue('--button-glow-start').trim();
      
      button.style.setProperty('--button-glow', glowColor);
    };
    
    button.addEventListener("pointermove", handlePointerMove);
    
    // Cleanup event listener
    return () => {
      button.removeEventListener("pointermove", handlePointerMove);
    };
  }, [disabled]);

  // Handle click ripple effect
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    
    // Create ripple effect
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const rippleId = Date.now();
    setRipples(prev => [...prev, { id: rippleId, x, y }]);
    
    // Remove ripple after animation completes
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== rippleId));
    }, 600);
    
    // Execute onClick callback
    if (onClick) onClick(e);
  };

  // Determine display content
  const displayContent = children || text;

  return (
    <ButtonContainer fullWidth={fullWidth}>
      <motion.div
        initial={animateOnRender ? { y: 20, opacity: 0 } : false}
        animate={animateOnRender ? { y: 0, opacity: 1 } : false}
        transition={{ duration: 0.6, ease: "easeOut" }}
        onAnimationComplete={() => animateOnRender && setIsAnimating(true)}
      >
        <StyledGlowButton
          ref={buttonRef}
          onClick={handleClick}
          disabled={disabled || isLoading}
          $theme={buttonTheme}
          $size={buttonSize}
          $fullWidth={fullWidth}
          $glowIntensity={glowIntensity}
          {...props}
          aria-busy={isLoading}
          aria-label={props['aria-label'] || (typeof displayContent === 'string' ? displayContent : 'Button')}
        >
          <Gradient />
          <ButtonSpan isAnimating={isAnimating}>
            {isLoading && <Spinner />}
            {!isLoading && resolvedLeftIcon && (
              <IconContainer position="left">{resolvedLeftIcon}</IconContainer>
            )}
            {displayContent}
            {!isLoading && resolvedRightIcon && (
              <IconContainer position="right">{resolvedRightIcon}</IconContainer>
            )}
            
            {/* Render ripples */}
            {ripples.map(ripple => (
              <Ripple 
                key={ripple.id} 
                $x={ripple.x}
                $y={ripple.y}
              />
            ))}
          </ButtonSpan>
        </StyledGlowButton>
      </motion.div>
    </ButtonContainer>
  );
};

export default GlowButton;