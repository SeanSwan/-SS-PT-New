/**
 * Global Icon Shim - Emergency fix for icon import issues
 * This file provides fallbacks for any missing icons to prevent crashes
 */
import React from 'react';

// Create a default icon component for fallbacks
const DefaultIcon = ({ size = 20, color = 'currentColor', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

// Global icon shim to prevent crashes
if (typeof window !== 'undefined') {
  window.IconShim = {
    FaArrowLeft: DefaultIcon,
    FaArrowRight: DefaultIcon,
    FaChevronDown: DefaultIcon,
    FaUser: DefaultIcon,
    FaShoppingCart: DefaultIcon,
    DefaultIcon
  };
}

console.log('✅ Global Icon Shim loaded successfully');

export default DefaultIcon;
