/**
 * Animations
 * ==========
 * Reusable keyframe animations and animation variants for Framer Motion
 * 
 * Usage:
 * import { shimmer, pulseAnimation, containerVariants } from '@/components/ui-kit/Animations';
 * 
 * // In styled-component:
 * animation: ${shimmer} 4s linear infinite;
 * 
 * // In motion component:
 * <motion.div variants={containerVariants} initial="hidden" animate="visible">
 */

import { keyframes } from 'styled-components';

// ==========================================
// KEYFRAME ANIMATIONS
// ==========================================

/**
 * Shimmer animation - Creates a shimmering gradient effect
 * Perfect for: Text gradients, loading states, premium effects
 */
export const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

/**
 * Float animation - Gentle up and down movement
 * Perfect for: Cards, badges, decorative elements
 */
export const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

/**
 * Pulse animation - Scale and glow pulse effect
 * Perfect for: Action buttons, notifications, alerts
 */
export const pulseAnimation = keyframes`
  0% { 
    transform: scale(1); 
    box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.7); 
  }
  70% { 
    transform: scale(1.05); 
    box-shadow: 0 0 0 8px rgba(0, 255, 255, 0); 
  }
  100% { 
    transform: scale(1); 
    box-shadow: 0 0 0 0 rgba(0, 255, 255, 0); 
  }
`;

/**
 * Glow animation - Subtle glow effect
 * Perfect for: Interactive elements, status indicators
 */
export const glowAnimation = keyframes`
  0% { 
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.3); 
  }
  50% { 
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.5), 0 0 30px rgba(120, 81, 169, 0.3); 
  }
  100% { 
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.3); 
  }
`;

/**
 * Text glow animation - Glowing text effect
 * Perfect for: Headers, important text, call-to-actions
 */
export const textGlow = keyframes`
  0%, 100% { 
    text-shadow: 0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(120, 81, 169, 0.4); 
  }
  50% { 
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 15px rgba(120, 81, 169, 0.6); 
  }
`;

/**
 * Spin animation - Continuous rotation
 * Perfect for: Loading spinners, refresh indicators
 */
export const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

/**
 * Fade in animation
 * Perfect for: Page transitions, modal entrances
 */
export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

/**
 * Slide up animation
 * Perfect for: Content reveals, notifications
 */
export const slideUp = keyframes`
  from { 
    transform: translateY(20px); 
    opacity: 0; 
  }
  to { 
    transform: translateY(0); 
    opacity: 1; 
  }
`;

/**
 * Bounce animation
 * Perfect for: Success indicators, playful interactions
 */
export const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
`;

// ==========================================
// FRAMER MOTION VARIANTS
// ==========================================

/**
 * Container variants - For parent containers with stagger children
 * Usage: <motion.div variants={containerVariants} initial="hidden" animate="visible">
 */
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      when: "beforeChildren",
      staggerChildren: 0.1,
      duration: 0.3
    }
  }
};

/**
 * Item variants - For child items in staggered animations
 * Usage: <motion.div variants={itemVariants}>
 */
export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { 
      type: "spring", 
      stiffness: 100, 
      damping: 10 
    }
  }
};

/**
 * Staggered item variants - Custom delay for each item
 * Usage: <motion.div variants={staggeredItemVariants} custom={index}>
 */
export const staggeredItemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: (custom: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      delay: custom * 0.1,
      type: "spring",
      stiffness: 100,
      damping: 10
    }
  })
};

/**
 * Fade variants - Simple fade in/out
 */
export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

/**
 * Scale variants - Zoom in/out effect
 */
export const scaleVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { 
      type: "spring",
      stiffness: 200,
      damping: 20
    }
  },
  exit: { 
    scale: 0.8, 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

/**
 * Slide variants - Slide from different directions
 */
export const slideVariants = {
  fromRight: {
    hidden: { x: 100, opacity: 0 },
    visible: { x: 0, opacity: 1 }
  },
  fromLeft: {
    hidden: { x: -100, opacity: 0 },
    visible: { x: 0, opacity: 1 }
  },
  fromTop: {
    hidden: { y: -100, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  },
  fromBottom: {
    hidden: { y: 100, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  }
};

export default {
  // Keyframes
  shimmer,
  float,
  pulseAnimation,
  glowAnimation,
  textGlow,
  spin,
  fadeIn,
  slideUp,
  bounce,
  
  // Motion variants
  containerVariants,
  itemVariants,
  staggeredItemVariants,
  fadeVariants,
  scaleVariants,
  slideVariants,
};
