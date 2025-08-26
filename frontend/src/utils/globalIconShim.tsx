// GLOBAL ICON SHIM - Fix FaArrowLeft undefined error
// This creates a global reference for any missing Font Awesome icons

import React from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

// Create global window object for icons if needed
if (typeof window !== 'undefined') {
  window.FaArrowLeft = ArrowLeft;
  window.FaArrowRight = ArrowRight;
  window.FaChevronLeft = ChevronLeft;
  window.FaChevronRight = ChevronRight;
}

// Also export for module imports
export const FaArrowLeft = ArrowLeft;
export const FaArrowRight = ArrowRight;
export const FaChevronLeft = ChevronLeft;
export const FaChevronRight = ChevronRight;

// If there are any other FA icons that might be undefined, add them here
export default {
  FaArrowLeft: ArrowLeft,
  FaArrowRight: ArrowRight,
  FaChevronLeft: ChevronLeft,
  FaChevronRight: ChevronRight
};