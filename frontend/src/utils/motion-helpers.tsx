/**
 * motion-helpers.tsx
 * Utility functions for working with framer-motion and styled-components together
 */
import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { defaultShouldForwardProp } from './styled-component-helpers';
import { MOTION_SECONDS, STAGGER_CHILDREN_SECONDS } from '../core/perf/motionTokens';

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
 *
 * A4: all durations and the stagger interval are now derived from
 * `core/perf/motionTokens` (the single authority). Before this change these
 * literals were independent duplicates: every `duration` here was 0.5 while the
 * contract specifies the 200ms response value, and `staggerChildren` was 0.1
 * while the contract specifies 0.06.
 */
const RESPONSE = MOTION_SECONDS.response;

export const animationVariants = {
  // Fade in animation
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: RESPONSE
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
        duration: RESPONSE
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
        duration: RESPONSE
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
        duration: RESPONSE
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
        duration: RESPONSE
      }
    }
  },
  
  // Container variant with staggered children
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: STAGGER_CHILDREN_SECONDS,
        delayChildren: 0
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
        duration: RESPONSE
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