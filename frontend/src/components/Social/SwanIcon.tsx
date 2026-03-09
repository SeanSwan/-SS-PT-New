/**
 * SwanIcon.tsx — Geometric Swan profile SVG for the "Elevate" (like) action.
 * Per Gemini 3.1 Pro design authority:
 *   - Un-elevated: stroke #7851A9, fill transparent, stroke-width 2px
 *   - Elevated: fill #8B5CF6 (Wing Purple), stroke none, drop-shadow glow
 */
import React from 'react';
import { motion } from 'framer-motion';

interface SwanIconProps {
  size?: number;
  elevated?: boolean;
  className?: string;
}

const SwanIcon: React.FC<SwanIconProps> = ({ size = 24, elevated = false, className }) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      whileTap={{ scale: 0.8, rotate: -15 }}
      animate={{
        scale: elevated ? [1, 1.3, 1] : 1,
        rotate: elevated ? [0, 10, 0] : 0,
      }}
      transition={{ duration: 0.4, type: 'spring', stiffness: 300 }}
    >
      {/* Geometric swan profile — elegant S-curve neck with wing */}
      <path
        d={
          // Head and beak
          'M8 3C7 3 6 4 6 5C6 6 7 7 8 7' +
          // Neck curve (elegant S-shape)
          'C9 7 10 8 10 10C10 12 9 14 8 15' +
          // Body
          'C7 16 6 17 5 18C4 19 4 20 5 21' +
          // Tail
          'C6 22 8 22 10 21C12 20 14 19 16 18' +
          // Wing top
          'C18 17 20 15 20 13C20 11 19 9 17 8' +
          // Wing curve back
          'C15 7 13 8 12 10' +
          // Inner neck
          'C12 8 11 6 10 5C9 4 8.5 3 8 3Z'
        }
        fill={elevated ? '#8B5CF6' : 'transparent'}
        stroke={elevated ? 'none' : '#7851A9'}
        strokeWidth={elevated ? 0 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={elevated ? {
          filter: 'drop-shadow(0px 0px 8px rgba(139, 92, 246, 0.6))',
        } : undefined}
      />
      {/* Eye dot */}
      <circle
        cx="7.5"
        cy="5"
        r="0.8"
        fill={elevated ? '#ffffff' : '#7851A9'}
      />
    </motion.svg>
  );
};

export default SwanIcon;
