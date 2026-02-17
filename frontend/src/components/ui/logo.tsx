/**
 * logo.tsx
 * Logo component that renders the application logo
 */
import React from 'react';

// Import logo file from assets with the correct path
// Based on your file tree, Logo.png is in src/assets/Logo.png
// From components/ui/logo.tsx, we need to go up two levels
import logoPng from '../../assets/Logo.png';

interface LogoProps {
  /**
   * Use this prop to override the default size
   */
  width?: string | number;
  height?: string | number;
  
  /**
   * Optional className for additional styling
   */
  className?: string;
  
  /**
   * Alt text for accessibility
   */
  alt?: string;
  
  /**
   * Click handler
   */
  onClick?: () => void;
}

/**
 * Logo component for displaying your brand identity
 * Can be used in navbar, sidebar, footer, and other branding locations
 */
const Logo: React.FC<LogoProps> = ({ 
  width = 'auto', 
  height = '40', 
  className = '',
  alt = 'Swan Studios',
  onClick
}) => {
  // Since we're using the same logo for all themes, no need for theme-based selection
  return (
    <img
      src={logoPng}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    />
  );
};

export default Logo;