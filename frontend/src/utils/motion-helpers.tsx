/**
 * motion-helpers.tsx
 * Utility functions for working with framer-motion and styled-components together
 */
import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { defaultShouldForwardProp } from './styled-component-helpers';

/**
 * Creates a properly configured motion component for use with styled-components
 * This avoids warnings about unknown props being forwarded to DOM elements
 * 
 * @param Component The base component to wrap with motion
 * @param options Configuration options
 * @returns A properly configured motion component
 */
export const createMotionComponent = <C extends React.ElementType>(
  Component: C,
  options: {
    forwardProps?: string[];
    motionSpecificProps?: string[];
  } = {}
) => {
  const { forwardProps = [], motionSpecificProps = [] } = options;
  
  // Combine the default non-forwarded props with any custom ones
  const allPropsToFilter = [
    ...new Set([
      'variants',
      'initial',
      'animate',
      'exit',
      'transition',
      'whileHover',
      'whileTap',
      'whileFocus',
      'whileDrag',
      'onAnimationComplete',
      'onAnimationStart',
      'onDragStart',
      'onDragEnd',
      'layout',
      'layoutId',
      'custom',
      ...motionSpecificProps
    ])
  ].filter(prop => !forwardProps.includes(prop));
  
  // Create a shouldForwardProp function that filters out motion props
  const shouldForwardProp = (prop: string) => !allPropsToFilter.includes(prop);
  
  // Return the motion component wrapped with shouldForwardProp
  return motion(Component, { shouldForwardProp });
};

/**
 * Common animation variants that can be reused across components
 */
export const animationVariants = {
  // Fade in animation
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  },
  
  // Fade in from bottom
  fadeInUp: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  },
  
  // Fade in from left
  fadeInLeft: {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5
      }
    }
  },
  
  // Fade in from right
  fadeInRight: {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5
      }
    }
  },
  
  // Scale up animation
  scaleUp: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5
      }
    }
  },
  
  // Container variant with staggered children
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  },
  
  // Item variant for staggered children
  staggerItem: {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  }
};

/**
 * Higher order component to add motion capabilities to any component
 * This makes it easy to add animations to components without having to
 * create a new styled component
 * 
 * @param Component The component to wrap with motion
 * @param defaultProps Default motion props to apply
 * @returns A motion-enhanced component
 */
export function withMotion<P extends object>(
  Component: React.ComponentType<P>,
  defaultProps: MotionProps = {}
): React.FC<P & MotionProps> {
  const WithMotion: React.FC<P & MotionProps> = (props) => {
    const motionProps = { ...defaultProps, ...props };
    return <Component {...motionProps} />;
  };
  
  WithMotion.displayName = `WithMotion(${Component.displayName || Component.name || 'Component'})`;
  
  return WithMotion;
}

export default {
  createMotionComponent,
  animationVariants,
  withMotion
};