import React, { useEffect, useRef, useState, useMemo } from "react";
import styled, { css, keyframes } from "styled-components";
import { motion } from "framer-motion";

// Import the raw context so we can do a safe useContext (no throw) inside the
// component.  The module itself always resolves — it is the *provider* that
// may or may not be mounted higher in the tree.
import { useUniversalTheme as _useUniversalTheme } from '../../../context/ThemeContext/UniversalThemeContext';

// ─── Crystalline Swan Palette ──────────────────────────────────────────────────
// New 6-variant color scheme aligned with the Crystalline Swan design direction.
// Old variant names (neonBlue, purple, emerald, ruby, cosmic) are mapped to new
// names via LEGACY_VARIANT_MAP for full backward compatibility.
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Canonical Crystalline Swan color scheme variants.
 * Legacy names are accepted at runtime through the backward-compat map but
 * the exported type advertises both sets so existing consumers keep compiling.
 */
export type GlowButtonColorScheme =
  | 'primary'
  | 'accent'
  | 'gilded'
  | 'success'
  | 'danger'
  | 'ghost'
  // Legacy aliases — kept in the union so existing typed call-sites compile
  | 'neonBlue'
  | 'purple'
  | 'emerald'
  | 'ruby'
  | 'cosmic';

export type GlowButtonSize = 'small' | 'medium' | 'large';

// TypeScript interfaces for better type safety
export interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  variant?: GlowButtonColorScheme;
  theme?: GlowButtonColorScheme; // Alias for variant
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

// ─── Backward-compatibility map ────────────────────────────────────────────────
// Maps legacy variant names to their Crystalline Swan equivalents.
type CanonicalVariant = 'primary' | 'accent' | 'gilded' | 'success' | 'danger' | 'ghost';

const LEGACY_VARIANT_MAP: Record<string, CanonicalVariant> = {
  neonBlue: 'accent',
  purple: 'primary',
  emerald: 'success',
  ruby: 'danger',
  cosmic: 'primary',
};

/** Resolve any variant (including legacy names) to a canonical variant key. */
const resolveVariant = (v: string): CanonicalVariant => {
  if (v in LEGACY_VARIANT_MAP) return LEGACY_VARIANT_MAP[v];
  // Already a canonical variant
  return v as CanonicalVariant;
};

// ─── Crystalline Swan button themes ────────────────────────────────────────────
const BUTTON_THEMES: Record<CanonicalVariant, ButtonTheme> = {
  // PRIMARY — Midnight Sapphire base, Ice Wing glow
  primary: {
    background: "#002060",
    color: "#E0ECF4",
    shadow: "rgba(0, 32, 96, 0.35)",
    shineLeft: "rgba(96, 192, 240, 0.5)",   // Ice Wing
    shineRight: "rgba(80, 160, 240, 0.65)",  // Arctic Cyan
    glowStart: "#60C0F0",                    // Ice Wing
    glowEnd: "#50A0F0",                      // Arctic Cyan
  },
  // ACCENT — Royal Depth base, Arctic Cyan glow
  accent: {
    background: "#003080",
    color: "#E0ECF4",
    shadow: "rgba(0, 48, 128, 0.35)",
    shineLeft: "rgba(80, 160, 240, 0.55)",   // Arctic Cyan
    shineRight: "rgba(96, 192, 240, 0.7)",   // Ice Wing
    glowStart: "#50A0F0",                    // Arctic Cyan
    glowEnd: "#60C0F0",                      // Ice Wing
  },
  // GILDED — Dark gold base, Gilded Fern glow (premium / CTA / checkout)
  gilded: {
    background: "#1A1505",
    color: "#E0ECF4",
    shadow: "rgba(198, 168, 75, 0.25)",
    shineLeft: "rgba(198, 168, 75, 0.55)",   // Gilded Fern
    shineRight: "rgba(218, 195, 110, 0.7)",  // Lighter gold
    glowStart: "#C6A84B",                    // Gilded Fern
    glowEnd: "#DAC36E",                      // Lighter gold
  },
  // SUCCESS — Dark green base, green glow
  success: {
    background: "#0A1E10",
    color: "#E0ECF4",
    shadow: "rgba(34, 197, 94, 0.2)",
    shineLeft: "rgba(34, 197, 94, 0.5)",
    shineRight: "rgba(74, 222, 128, 0.65)",
    glowStart: "#22C55E",
    glowEnd: "#4ADE80",
  },
  // DANGER — Dark red base, red glow
  danger: {
    background: "#1E0A0A",
    color: "#E0ECF4",
    shadow: "rgba(239, 68, 68, 0.2)",
    shineLeft: "rgba(239, 68, 68, 0.5)",
    shineRight: "rgba(252, 129, 129, 0.65)",
    glowStart: "#EF4444",
    glowEnd: "#FC8181",
  },
  // GHOST — transparent base, Swan Lavender glow (tertiary / text-like)
  ghost: {
    background: "transparent",
    color: "#E0ECF4",
    shadow: "rgba(64, 112, 192, 0.1)",
    shineLeft: "rgba(64, 112, 192, 0.3)",    // Swan Lavender
    shineRight: "rgba(96, 192, 240, 0.4)",   // Ice Wing
    glowStart: "#4070C0",                    // Swan Lavender
    glowEnd: "#60C0F0",                      // Ice Wing
  },
};

// ─── Light-theme overrides ─────────────────────────────────────────────────────
// When the active theme is crystalline-light, we swap colors for visibility on
// light backgrounds: glow color becomes the fill, opacity is reduced, and
// stronger box-shadows replace the soft glow.
const LIGHT_THEME_OVERRIDES: Record<CanonicalVariant, Partial<ButtonTheme>> = {
  primary: {
    background: "#60C0F0",            // Glow → fill
    color: "#FFFFFF",
    shadow: "rgba(0, 32, 96, 0.18)",
    shineLeft: "rgba(0, 32, 96, 0.3)",
    shineRight: "rgba(80, 160, 240, 0.4)",
  },
  accent: {
    background: "#50A0F0",
    color: "#FFFFFF",
    shadow: "rgba(0, 48, 128, 0.18)",
    shineLeft: "rgba(0, 48, 128, 0.3)",
    shineRight: "rgba(96, 192, 240, 0.4)",
  },
  gilded: {
    background: "#C6A84B",
    color: "#FFFFFF",
    shadow: "rgba(26, 21, 5, 0.18)",
    shineLeft: "rgba(26, 21, 5, 0.3)",
    shineRight: "rgba(198, 168, 75, 0.4)",
  },
  success: {
    background: "#22C55E",
    color: "#FFFFFF",
    shadow: "rgba(10, 30, 16, 0.18)",
    shineLeft: "rgba(10, 30, 16, 0.3)",
    shineRight: "rgba(34, 197, 94, 0.4)",
  },
  danger: {
    background: "#EF4444",
    color: "#FFFFFF",
    shadow: "rgba(30, 10, 10, 0.18)",
    shineLeft: "rgba(30, 10, 10, 0.3)",
    shineRight: "rgba(239, 68, 68, 0.4)",
  },
  ghost: {
    background: "transparent",
    color: "#002060",                 // Dark text on light
    shadow: "rgba(64, 112, 192, 0.08)",
    shineLeft: "rgba(64, 112, 192, 0.15)",
    shineRight: "rgba(64, 112, 192, 0.25)",
  },
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
const generateButtonVars = (
  theme: ButtonTheme,
  size: ButtonSize,
  fullWidth?: boolean,
  glowIntensity?: string,
  isLightTheme?: boolean,
) => css`
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
  --button-glow-opacity: ${
    isLightTheme
      ? (glowIntensity === 'high' ? '0.5' : glowIntensity === 'low' ? '0.15' : '0.3')
      : (glowIntensity === 'high' ? '1.2' : glowIntensity === 'low' ? '0.6' : '1')
  };
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
  $isLightTheme?: boolean;
  $isGhost?: boolean;
}

// StyledGlowButton with proper prop filtering
const StyledGlowButton = styled.button.withConfig({
  shouldForwardProp: (prop) => {
    // These are props we don't want to pass to the HTML button element
    const nonDOMProps = [
      '$theme', '$size', '$fullWidth', '$glowIntensity', '$isLightTheme', '$isGhost',
      'isAnimating', 'variant',
      'startIcon', 'endIcon', 'leftIcon', 'rightIcon', // Icon props
      'animateOnRender', 'isLoading', // State props
      'text', 'glowIntensity', 'theme' // Content prop + alias
    ];
    return !nonDOMProps.includes(prop);
  }
})<StyledButtonProps>`
  ${({ $theme, $size, $fullWidth, $glowIntensity, $isLightTheme }) =>
    generateButtonVars($theme, $size, $fullWidth, $glowIntensity, $isLightTheme)}

  appearance: none;
  outline: none;
  border: ${({ $isGhost, $isLightTheme }) =>
    $isGhost
      ? ($isLightTheme ? '1.5px solid #4070C0' : '1px solid rgba(64, 112, 192, 0.4)')
      : 'none'};
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
  box-shadow: ${({ $isLightTheme }) =>
    $isLightTheme
      ? '0 2px 8px var(--button-shadow), 0 1px 3px rgba(0,0,0,0.08)'
      : '0 8px 20px var(--button-shadow)'};
  width: var(--button-width);
  height: var(--button-height);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    --button-glow-opacity: ${({ $isLightTheme }) => $isLightTheme ? '0.5' : '1'};
    --button-glow-duration: .25s;
    transform: translateY(-1px);
    box-shadow: ${({ $isLightTheme }) =>
      $isLightTheme
        ? '0 4px 14px var(--button-shadow), 0 2px 6px rgba(0,0,0,0.1)'
        : '0 10px 25px var(--button-shadow)'};
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
      box-shadow: ${({ $isLightTheme }) =>
        $isLightTheme
          ? '0 2px 8px var(--button-shadow)'
          : '0 8px 20px var(--button-shadow)'};
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

// ─── Safe theme hook ───────────────────────────────────────────────────────────
// Returns the current theme id, falling back to null when the GlowButton is
// rendered outside a UniversalThemeProvider (e.g. in Storybook or tests).
// We cannot wrap useContext in try/catch because hooks must not be called
// conditionally, so instead we call useContext unconditionally but tolerate
// `undefined` when the provider is missing.
function useSafeTheme(): string | null {
  try {
    const ctx = _useUniversalTheme();
    return ctx?.currentTheme ?? null;
  } catch {
    // Provider not mounted — fall through to default (dark) behavior
    return null;
  }
}

/**
 * Enhanced GlowButton Component — Crystalline Swan Edition
 *
 * A premium button component with animated glow effects, customizable color
 * schemes, theme awareness, and accessibility features.
 *
 * Color schemes:  primary | accent | gilded | success | danger | ghost
 * Legacy aliases: neonBlue → accent, purple → primary, emerald → success,
 *                 ruby → danger, cosmic → primary
 */
const GlowButton: React.FC<GlowButtonProps> = ({
  text,
  children,
  variant = "primary",
  theme,
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

  // ── Theme awareness ────────────────────────────────────────────────────────
  const currentTheme = useSafeTheme();
  const isLightTheme = currentTheme === 'crystalline-light';

  // Resolve icon props (support both leftIcon/rightIcon and startIcon/endIcon)
  const resolvedLeftIcon = leftIcon || startIcon;
  const resolvedRightIcon = rightIcon || endIcon;

  // Resolve variant (support theme alias + legacy names) and size configurations
  const rawVariant = typeof theme === "string" ? theme : variant;
  const canonicalVariant = resolveVariant(rawVariant);

  // Build the final ButtonTheme, merging light-theme overrides when needed
  const buttonTheme = useMemo<ButtonTheme>(() => {
    const base = BUTTON_THEMES[canonicalVariant] || BUTTON_THEMES.primary;
    if (!isLightTheme) return base;
    const overrides = LIGHT_THEME_OVERRIDES[canonicalVariant];
    return overrides ? { ...base, ...overrides } : base;
  }, [canonicalVariant, isLightTheme]);

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
          $isLightTheme={isLightTheme}
          $isGhost={canonicalVariant === 'ghost'}
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