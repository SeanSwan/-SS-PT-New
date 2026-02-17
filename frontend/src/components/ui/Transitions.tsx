// src/components/ui/Transitions.tsx
import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TransitionsProps {
  children: React.ReactNode;
  type?: 'grow' | 'fade' | 'collapse' | 'slide' | 'zoom';
  position?: 'top-left' | 'top-right' | 'top' | 'bottom-left' | 'bottom-right' | 'bottom';
  direction?: 'up' | 'down' | 'left' | 'right';
  in?: boolean;
  [key: string]: any;
}

const getTransformOrigin = (position: string) => {
  switch (position) {
    case 'top-right': return 'top right';
    case 'top': return 'top';
    case 'bottom-left': return 'bottom left';
    case 'bottom-right': return 'bottom right';
    case 'bottom': return 'bottom';
    case 'top-left':
    default: return '0 0 0';
  }
};

const getSlideDirection = (direction: string) => {
  switch (direction) {
    case 'up': return { y: 50 };
    case 'down': return { y: -50 };
    case 'left': return { x: 50 };
    case 'right': return { x: -50 };
    default: return { y: 50 };
  }
};

const Transitions = forwardRef<HTMLDivElement, TransitionsProps>(
  ({ children, position = 'top-left', type = 'grow', direction = 'up', in: show = true, style, ...others }, ref) => {
    const transformOrigin = getTransformOrigin(position);

    const getVariants = () => {
      switch (type) {
        case 'grow':
          return {
            initial: { opacity: 0, scale: 0.8 },
            animate: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0.8 }
          };
        case 'fade':
          return {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: 0.5 }
          };
        case 'collapse':
          return {
            initial: { opacity: 0, height: 0, overflow: 'hidden' },
            animate: { opacity: 1, height: 'auto', overflow: 'hidden' },
            exit: { opacity: 0, height: 0, overflow: 'hidden' }
          };
        case 'slide':
          return {
            initial: { opacity: 0, ...getSlideDirection(direction) },
            animate: { opacity: 1, x: 0, y: 0 },
            exit: { opacity: 0, ...getSlideDirection(direction) },
            transition: { duration: 0.3 }
          };
        case 'zoom':
          return {
            initial: { opacity: 0, scale: 0 },
            animate: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0 }
          };
        default:
          return {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 }
          };
      }
    };

    const variants = getVariants();

    return (
      <div ref={ref}>
        <AnimatePresence>
          {show && (
            <motion.div
              initial={variants.initial}
              animate={variants.animate}
              exit={variants.exit}
              transition={variants.transition || { duration: 0.3, ease: 'easeInOut' }}
              style={{ ...style, transformOrigin }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

export default Transitions;
