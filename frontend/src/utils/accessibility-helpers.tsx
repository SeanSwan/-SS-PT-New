/**
 * accessibility-helpers.tsx
 * Utilities to help implement accessibility features consistently across the application
 */
import React from 'react';

/**
 * Generate an accessible label with appropriate context
 * 
 * @param content The label content
 * @param context Optional context to add to the label
 * @returns Formatted accessible label
 */
export const accessibleLabel = (content: string, context?: string): string => {
  if (context) {
    return `${content} - ${context}`;
  }
  return content;
};

/**
 * Skip to content link component that appears when tabbed to
 * This allows keyboard users to skip navigation and jump straight to main content
 */
export const SkipToContent: React.FC<{ mainContentId?: string }> = ({ 
  mainContentId = 'main-content' 
}) => {
  return (
    <a 
      href={`#${mainContentId}`}
      className="skip-to-content"
      style={{
        position: 'absolute',
        top: '-40px',
        left: 0,
        background: '#7851a9',
        color: 'white',
        padding: '8px 16px',
        zIndex: 9999,
        transition: 'top 0.2s ease',
        textDecoration: 'none',
        borderRadius: '0 0 4px 0',
        fontWeight: 500,
        ':focus': {
          top: 0,
          outline: '2px solid #00ffff', 
          outlineOffset: 2,
        }
      }}
    >
      Skip to main content
    </a>
  );
};

/**
 * Format a string for use as an ARIA label by ensuring proper spacing and capitalization
 */
export const formatAriaLabel = (text: string): string => {
  // Remove extra spaces and hyphens, replace with single spaces
  const cleanedText = text.replace(/[-_\s]+/g, ' ').trim();
  
  // Capitalize first letter of each word
  return cleanedText
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Create a visually hidden element (visible to screen readers only)
 */
export const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <span 
      style={{
        border: 0,
        clip: 'rect(0 0 0 0)',
        height: '1px',
        margin: '-1px',
        overflow: 'hidden',
        padding: 0,
        position: 'absolute',
        width: '1px',
        whiteSpace: 'nowrap',
        wordWrap: 'normal'
      }}
    >
      {children}
    </span>
  );
};

/**
 * Props for the AccessibleIcon component
 */
interface AccessibleIconProps {
  icon: React.ReactNode;
  label: string;
  as?: keyof JSX.IntrinsicElements;
  onClick?: () => void;
  [key: string]: any;
}

/**
 * Make an icon accessible by adding proper aria-label
 */
export const AccessibleIcon: React.FC<AccessibleIconProps> = ({
  icon,
  label,
  as: Component = 'span',
  onClick,
  ...props
}) => {
  const elementProps = {
    'aria-label': label,
    'role': onClick ? 'button' : 'img',
    'tabIndex': onClick ? 0 : undefined,
    'onClick': onClick,
    'onKeyDown': onClick ? (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    } : undefined,
    ...props
  };

  return (
    // @ts-ignore - This is a valid use of dynamic components
    <Component {...elementProps}>
      {icon}
    </Component>
  );
};

/**
 * Check if a color has sufficient contrast against a background color
 * Returns true if the contrast ratio meets WCAG AA standards (4.5:1 for normal text)
 * 
 * @param foreground Foreground color in hex format (#RRGGBB)
 * @param background Background color in hex format (#RRGGBB)
 * @param isLargeText Whether the text is large (18pt or 14pt bold)
 * @returns Whether the contrast is sufficient for WCAG AA
 */
export const hasEnoughContrast = (
  foreground: string, 
  background: string, 
  isLargeText = false
): boolean => {
  // Convert hex to RGB
  const hexToRgb = (hex: string): number[] => {
    const bigint = parseInt(hex.slice(1), 16);
    return [
      (bigint >> 16) & 255,
      (bigint >> 8) & 255,
      bigint & 255
    ];
  };

  // Calculate relative luminance
  const calculateLuminance = (rgb: number[]): number => {
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  // Calculate contrast ratio
  const calculateContrast = (luminance1: number, luminance2: number): number => {
    const light = Math.max(luminance1, luminance2);
    const dark = Math.min(luminance1, luminance2);
    return (light + 0.05) / (dark + 0.05);
  };

  // Clean and normalize hex colors
  const cleanForeground = foreground.startsWith('#') ? foreground : `#${foreground}`;
  const cleanBackground = background.startsWith('#') ? background : `#${background}`;

  // Calculate luminance values
  const luminance1 = calculateLuminance(hexToRgb(cleanForeground));
  const luminance2 = calculateLuminance(hexToRgb(cleanBackground));

  // Calculate contrast ratio
  const contrast = calculateContrast(luminance1, luminance2);

  // Check against WCAG standards
  return isLargeText ? contrast >= 3 : contrast >= 4.5;
};

export default {
  accessibleLabel,
  SkipToContent,
  formatAriaLabel,
  VisuallyHidden,
  AccessibleIcon,
  hasEnoughContrast
};