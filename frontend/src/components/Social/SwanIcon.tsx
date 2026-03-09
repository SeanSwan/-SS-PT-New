/**
 * SwanIcon.tsx — SwanStudios logo as reaction button icon.
 * Uses the actual low-poly crystal swan logo (Logo.png).
 * Elevated state: Wing Purple glow + scale animation via framer-motion.
 */
import React from 'react';
import { motion } from 'framer-motion';
import logoSrc from '../../assets/Logo.png';

interface SwanIconProps {
  size?: number;
  elevated?: boolean;
  className?: string;
}

const SwanIcon: React.FC<SwanIconProps> = ({ size = 24, elevated = false, className }) => {
  return (
    <motion.img
      src={logoSrc}
      alt="Swan"
      width={size}
      height={size}
      className={className}
      draggable={false}
      whileTap={{ scale: 0.8, rotate: -15 }}
      animate={{
        scale: elevated ? [1, 1.25, 1] : 1,
      }}
      transition={{ duration: 0.4, type: 'spring', stiffness: 300 }}
      style={{
        borderRadius: '50%',
        objectFit: 'cover',
        filter: elevated
          ? 'drop-shadow(0px 0px 8px rgba(139, 92, 246, 0.7)) drop-shadow(0px 0px 16px rgba(139, 92, 246, 0.4))'
          : 'grayscale(0.3) opacity(0.7)',
        transition: 'filter 0.3s ease',
      }}
    />
  );
};

export default SwanIcon;
