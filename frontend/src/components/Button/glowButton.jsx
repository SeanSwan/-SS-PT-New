import React, { useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { gsap } from "gsap";
import chroma from "chroma-js";
import { useUniversalTheme } from '../../context/ThemeContext';

// Button theme options with different color schemes
const BUTTON_THEMES = {
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
const BUTTON_SIZES = {
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
const generateButtonVars = (theme, size) => css`
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
  --button-glow-opacity: 0;
  --button-glow-duration: 0.5s;
  --button-font-size: ${size.fontSize};
  --button-padding: ${size.padding};
  --button-width: ${size.width};
  --button-height: ${size.height};
  --button-border-radius: ${size.borderRadius};
`;

// Main button container
const ButtonContainer = styled.div`
  display: inline-block;
  position: relative;
  transition: transform 0.2s ease;
  
  &:active {
    transform: translateY(2px) scale(0.98);
  }
`;

// StyledGlowButton is our styled component that creates the base button element
// We need to make sure it doesn't try to forward props that aren't valid HTML attributes
const StyledGlowButton = styled.button.withConfig({
  shouldForwardProp: (prop) => {
    // These are props we don't want to pass to the HTML button element
    const nonDOMProps = [
      'theme', 'size', 'isAnimating', 'variant', 
      'startIcon', 'endIcon', 'leftIcon', 'rightIcon', // Icon props
      'animateOnRender', 'isLoading', // State props
      'text' // Content prop
    ];
    return !nonDOMProps.includes(prop);
  }
})`
  ${({ theme, size }) => generateButtonVars(theme, size)}
  
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

// FIX: Modified ButtonSpan to prevent isAnimating prop from reaching the DOM
// Button text with glow effect
const ButtonSpan = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== 'isAnimating'
})`
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
    transition: opacity var(--button-glow-duration, .5s);
    filter: blur(20px);
  }
`;

// Click ripple effect
const Ripple = styled.span`
  position: absolute;
  top: calc(var(--y, 0) * 1px);
  left: calc(var(--x, 0) * 1px);
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
const IconContainer = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  ${({ position }) => position === 'left' ? 'margin-right: 8px;' : 'margin-left: 8px;'}
`;

/**
 * Enhanced GlowButton Component
 * @param {Object} props - Component props
 * @param {string} props.text - Button text
 * @param {string} props.theme - Button theme (primary, purple, emerald, ruby, cosmic)
 * @param {string} props.size - Button size (small, medium, large)
 * @param {boolean} props.isLoading - Loading state
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.animateOnRender - Animate the button on initial render
 * @param {React.ReactNode} props.leftIcon - Icon to display before text
 * @param {React.ReactNode} props.rightIcon - Icon to display after text
 * @param {Function} props.onClick - Click handler function
 */
const GlowButton = ({
  text,
  theme = "primary", // Default to PRIMARY (blue/cyan) theme
  size = "medium",
  isLoading = false,
  disabled = false,
  animateOnRender = false,
  leftIcon,
  rightIcon,
  onClick,
  ...props
}) => {
  const buttonRef = useRef(null);
  const [ripples, setRipples] = useState([]);
  const [isAnimating, setIsAnimating] = useState(animateOnRender);
  
  // Get universal theme for enhanced theming (with fallback)
  let currentTheme = 'swan-galaxy'; // Default fallback
  try {
    const themeContext = useUniversalTheme();
    currentTheme = themeContext.currentTheme;
  } catch (error) {
    // If used outside UniversalThemeProvider, use default
    console.warn('GlowButton used outside UniversalThemeProvider, using default theme');
  }
  
  // Handle theme selection with universal theme awareness
  const getEnhancedTheme = (themeName) => {
    const baseTheme = BUTTON_THEMES[themeName] || BUTTON_THEMES.primary;
    
    // Enhance with universal theme colors if available
    if (currentTheme === 'admin-command' && themeName === 'primary') {
      return {
        ...baseTheme,
        glowStart: "#3b82f6",
        glowEnd: "#2563eb",
        shineLeft: "rgba(59, 130, 246, 0.5)",
        shineRight: "rgba(37, 99, 235, 0.65)",
      };
    }
    
    if (currentTheme === 'dark-galaxy' && themeName === 'primary') {
      return {
        ...baseTheme,
        background: "#1a1a1a",
        glowStart: "#ffffff",
        glowEnd: "#00ffff",
        shineLeft: "rgba(255, 255, 255, 0.5)",
        shineRight: "rgba(0, 255, 255, 0.65)",
      };
    }
    
    return baseTheme;
  };
  
  const buttonTheme = getEnhancedTheme(theme);
  const buttonSize = BUTTON_SIZES[size] || BUTTON_SIZES.medium;
  
  // Handle cursor tracking for glow effect
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    
    const handlePointerMove = (e) => {
      if (disabled) return;
      
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      gsap.to(button, {
        "--pointer-x": `${x}px`,
        "--pointer-y": `${y}px`,
        duration: 0.6,
      });

      gsap.to(button, {
        "--button-glow": chroma
          .mix(
            getComputedStyle(button)
              .getPropertyValue("--button-glow-start")
              .trim(),
            getComputedStyle(button)
              .getPropertyValue("--button-glow-end")
              .trim(),
            x / rect.width
          )
          .hex(),
        duration: 0.2,
      });
    };
    
    button.addEventListener("pointermove", handlePointerMove);
    
    // Entrance animation
    if (animateOnRender) {
      gsap.from(button, {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        onComplete: () => {
          setIsAnimating(true);
        }
      });
    }
    
    // Cleanup event listener
    return () => {
      button.removeEventListener("pointermove", handlePointerMove);
    };
  }, [animateOnRender, disabled]);

  // Handle click ripple effect
  const handleClick = (e) => {
    if (disabled || isLoading) return;
    
    // Create ripple effect
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const rippleId = Date.now();
    setRipples([...ripples, { id: rippleId, x, y }]);
    
    // Remove ripple after animation completes
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== rippleId));
    }, 600);
    
    // Execute onClick callback
    if (onClick) onClick(e);
  };

  // Filter out any custom props that shouldn't be forwarded to the DOM
  const buttonProps = { ...props };
  
  // Remove known custom props to avoid React warnings
  const customProps = [
    'text', 'theme', 'size', 'isLoading', 'animateOnRender', 
    'leftIcon', 'rightIcon', 'startIcon', 'endIcon', 'variant'
  ];
  
  customProps.forEach(prop => {
    if (prop in buttonProps) {
      delete buttonProps[prop];
    }
  });

  return (
    <ButtonContainer>
      <StyledGlowButton
        ref={buttonRef}
        onClick={handleClick}
        disabled={disabled || isLoading}
        theme={buttonTheme}
        size={buttonSize}
        {...buttonProps}
        aria-busy={isLoading}
      >
        <Gradient />
        <ButtonSpan isAnimating={isAnimating}>
          {isLoading && <Spinner />}
          {!isLoading && leftIcon && (
            <IconContainer position="left">{leftIcon}</IconContainer>
          )}
          {text}
          {!isLoading && rightIcon && (
            <IconContainer position="right">{rightIcon}</IconContainer>
          )}
          
          {/* Render ripples */}
          {ripples.map(ripple => (
            <Ripple 
              key={ripple.id} 
              style={{ "--x": ripple.x, "--y": ripple.y }}
            />
          ))}
        </ButtonSpan>
      </StyledGlowButton>
    </ButtonContainer>
  );
};

export default GlowButton;