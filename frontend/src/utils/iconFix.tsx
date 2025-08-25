// EMERGENCY ICON FIX - Replace any missing FaArrowLeft with ArrowLeft from lucide-react
import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

// Export common arrow icons as aliases for any components still expecting FA icons
export const FaArrowLeft = ArrowLeft;
export const FaArrowRight = ArrowRight;
export const FaChevronLeft = ArrowLeft;
export const FaChevronRight = ArrowRight;

// Default export for compatibility
const IconFix = {
  FaArrowLeft: ArrowLeft,
  FaArrowRight: ArrowRight,
  FaChevronLeft: ArrowLeft, 
  FaChevronRight: ArrowRight
};

export default IconFix;