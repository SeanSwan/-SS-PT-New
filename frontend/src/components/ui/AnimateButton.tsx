// src/components/ui/AnimateButton.tsx
import React from 'react';
import { motion } from 'framer-motion';

// ==============================|| ANIMATION BUTTON ||============================== //

interface AnimateButtonProps {
  children: React.ReactNode;
  type?: 'slide' | 'scale' | 'rotate';
  direction?: 'up' | 'down' | 'left' | 'right';
  offset?: number;
  scale?: number;
  [key: string]: any;
}

const AnimateButton = ({ children, type = 'scale', direction = 'right', offset = 10, scale = 1.1, ...others }: AnimateButtonProps) => {
  switch (type) {
    case 'rotate':
      return (
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{
            type: 'spring',
            stiffness: 50,
            damping: 10
          }}
          {...others}
        >
          {children}
        </motion.div>
      );
    case 'slide':
      return (
        <motion.div
          whileHover={{
            x: direction === 'left' ? -offset : direction === 'right' ? offset : 0,
            y: direction === 'up' ? -offset : direction === 'down' ? offset : 0
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 10
          }}
          {...others}
        >
          {children}
        </motion.div>
      );
    case 'scale':
    default:
      return (
        <motion.div
          whileHover={{ scale }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 10
          }}
          {...others}
        >
          {children}
        </motion.div>
      );
  }
};

export default AnimateButton;