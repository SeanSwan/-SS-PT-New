/**
 * logo.tsx
 * Logo component that renders the application logo
 */
import React from 'react';
import { useTheme } from '@mui/material/styles';

// Import logo files from assets
import logoDark from '../assets/logo-dark.svg';
import logoLight from '../assets/logo.svg';
import logoPng from '../assets/Logo.png';

interface LogoProps {
  /**
   * Use this prop to override the default size
   */
  width?: string | number;
  height?: string | number;
  
  /**
   * Show the PNG version instead of SVG
   */
  usePng?: boolean;
  
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
  usePng = false,
  className = '',
  alt = 'Swan Studios',
  onClick
}) => {
  const theme = useTheme();
  
  // Determine which logo to use based on theme and usePng prop
  const logoSrc = usePng 
    ? logoPng 
    : theme.palette.mode === 'dark' 
      ? logoDark 
      : logoLight;

  return (
    <img
      src={logoSrc}
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