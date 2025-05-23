/**
 * navigation-scroll.tsx
 * Component that scrolls to top when navigation changes
 */
import React, { useEffect, ReactNode } from 'react';

// Interface for component props
interface NavigationScrollProps {
  children: ReactNode;
}

/**
 * NavigationScroll Component
 * Automatically scrolls the window to the top when the component mounts
 * Useful for page transitions to ensure content starts at the top
 */
const NavigationScroll: React.FC<NavigationScrollProps> = ({ children }) => {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, []);

  // Return children or null if no children provided
  return children || null;
};

export default NavigationScroll;