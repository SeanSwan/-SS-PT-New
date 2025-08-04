/**
 * Gamification Animations
 * =======================
 * 
 * Ultra-smooth, pixel-perfect animations for admin gamification features
 * GPU-accelerated performance with accessibility considerations
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Achievement celebration sequences
 * - Progress visualization animations
 * - Micro-interaction feedback
 * - Mobile-optimized performance
 * - Reduced motion support
 */

import { keyframes, css } from 'styled-components';
import { exerciseCommandTheme, mediaQueries } from './exerciseCommandTheme';

// === ACHIEVEMENT CELEBRATION ANIMATIONS ===

export const achievementUnlock = keyframes`
  0% {
    transform: scale(0) rotate(180deg);
    opacity: 0;
    filter: blur(10px);
  }
  25% {
    transform: scale(1.3) rotate(360deg);
    opacity: 0.8;
    filter: blur(5px);
  }
  50% {
    transform: scale(0.9) rotate(540deg);
    opacity: 1;
    filter: blur(0px);
  }
  75% {
    transform: scale(1.1) rotate(720deg);
    opacity: 1;
    filter: blur(0px);
  }
  100% {
    transform: scale(1) rotate(720deg);
    opacity: 1;
    filter: blur(0px);
  }
`;

export const confettiParticle = keyframes`
  0% {
    transform: translateY(0) translateX(0) rotate(0deg) scale(1);
    opacity: 1;
  }
  25% {
    transform: translateY(-50px) translateX(20px) rotate(90deg) scale(1.2);
    opacity: 0.9;
  }
  50% {
    transform: translateY(-80px) translateX(-10px) rotate(180deg) scale(1);
    opacity: 0.7;
  }
  75% {
    transform: translateY(-100px) translateX(30px) rotate(270deg) scale(0.8);
    opacity: 0.4;
  }
  100% {
    transform: translateY(-120px) translateX(-20px) rotate(360deg) scale(0.5);
    opacity: 0;
  }
`;

export const levelUpSequence = keyframes`
  0% {
    transform: scale(0.8) translateY(10px);
    opacity: 0;
    background-position: 0% 50%;
  }
  25% {
    transform: scale(1.1) translateY(-5px);
    opacity: 0.7;
    background-position: 25% 50%;
  }
  50% {
    transform: scale(1) translateY(0);
    opacity: 1;
    background-position: 50% 50%;
  }
  75% {
    transform: scale(1.05) translateY(-2px);
    opacity: 1;
    background-position: 75% 50%;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
    background-position: 100% 50%;
  }
`;

export const streakFlame = keyframes`
  0%, 100% {
    transform: scale(1) rotate(0deg);
    filter: hue-rotate(0deg) brightness(1);
  }
  25% {
    transform: scale(1.1) rotate(2deg);
    filter: hue-rotate(10deg) brightness(1.1);
  }
  50% {
    transform: scale(1.05) rotate(-1deg);
    filter: hue-rotate(20deg) brightness(1.2);
  }
  75% {
    transform: scale(1.08) rotate(1deg);
    filter: hue-rotate(10deg) brightness(1.1);
  }
`;

// === PROGRESS VISUALIZATION ANIMATIONS ===

export const progressBarFill = keyframes`
  0% {
    width: 0%;
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

export const progressRing = keyframes`
  0% {
    stroke-dasharray: 0 283;
    transform: rotate(-90deg);
  }
  100% {
    transform: rotate(-90deg);
  }
`;

export const experienceGain = keyframes`
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateY(-20px) scale(1.2);
    opacity: 0.8;
  }
  100% {
    transform: translateY(-40px) scale(1);
    opacity: 0;
  }
`;

export const pointsCounter = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
`;

// === MICRO-INTERACTION ANIMATIONS ===

export const buttonPress = keyframes`
  0% {
    transform: scale(1);
    box-shadow: ${exerciseCommandTheme.shadows.buttonElevation};
  }
  50% {
    transform: scale(0.98);
    box-shadow: ${exerciseCommandTheme.shadows.buttonPressed};
  }
  100% {
    transform: scale(1);
    box-shadow: ${exerciseCommandTheme.shadows.buttonElevation};
  }
`;

export const cardHover = keyframes`
  0% {
    transform: translateY(0) scale(1);
    box-shadow: ${exerciseCommandTheme.shadows.exerciseCard};
  }
  100% {
    transform: translateY(-4px) scale(1.02);
    box-shadow: ${exerciseCommandTheme.shadows.exerciseCardHover};
  }
`;

export const iconFloat = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
`;

export const glowPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 5px currentColor;
    opacity: 0.8;
  }
  50% {
    box-shadow: 0 0 20px currentColor, 0 0 30px currentColor;
    opacity: 1;
  }
`;

// === VIDEO UPLOAD ANIMATIONS ===

export const uploadPulse = keyframes`
  0% {
    transform: scale(1);
    background-position: 0% 50%;
  }
  50% {
    transform: scale(1.02);
    background-position: 100% 50%;
  }
  100% {
    transform: scale(1);
    background-position: 0% 50%;
  }
`;

export const uploadSuccess = keyframes`
  0% {
    transform: scale(1) rotate(0deg);
    background: ${exerciseCommandTheme.gradients.uploadZone};
  }
  25% {
    transform: scale(1.05) rotate(1deg);
    background: ${exerciseCommandTheme.gradients.formValidation};
  }
  50% {
    transform: scale(1.1) rotate(0deg);
    background: ${exerciseCommandTheme.gradients.formValidation};
  }
  75% {
    transform: scale(1.05) rotate(-1deg);
    background: ${exerciseCommandTheme.gradients.formValidation};
  }
  100% {
    transform: scale(1) rotate(0deg);
    background: ${exerciseCommandTheme.gradients.formValidation};
  }
`;

export const dragOver = keyframes`
  0%, 100% {
    border-color: ${exerciseCommandTheme.colors.stellarBlue};
    background: ${exerciseCommandTheme.gradients.uploadZone};
  }
  50% {
    border-color: ${exerciseCommandTheme.colors.cyberCyan};
    background: linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
  }
`;

// === FORM VALIDATION ANIMATIONS ===

export const validationSuccess = keyframes`
  0% {
    transform: scale(1);
    border-color: ${exerciseCommandTheme.colors.stellarBlue};
    box-shadow: ${exerciseCommandTheme.shadows.inputFocus};
  }
  50% {
    transform: scale(1.02);
    border-color: ${exerciseCommandTheme.colors.exerciseGreen};
    box-shadow: ${exerciseCommandTheme.shadows.formValidation};
  }
  100% {
    transform: scale(1);
    border-color: ${exerciseCommandTheme.colors.exerciseGreen};
    box-shadow: ${exerciseCommandTheme.shadows.formValidation};
  }
`;

export const validationError = keyframes`
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-2px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(2px);
  }
`;

export const nasmCompliance = keyframes`
  0% {
    background-position: 0% 50%;
    opacity: 0.8;
  }
  50% {
    background-position: 100% 50%;
    opacity: 1;
  }
  100% {
    background-position: 200% 50%;
    opacity: 0.8;
  }
`;

// === LOADING & PROCESSING ANIMATIONS ===

export const spinnerRotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

export const skeletonShimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

export const processingPulse = keyframes`
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
`;

// === PARTICLE SYSTEM ANIMATIONS ===

export const particleOrbit = keyframes`
  0% {
    transform: rotate(0deg) translateX(15px) rotate(0deg);
    opacity: 0;
  }
  10%, 90% {
    opacity: 1;
  }
  100% {
    transform: rotate(360deg) translateX(15px) rotate(-360deg);
    opacity: 0;
  }
`;

export const particleTwinkle = keyframes`
  0%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
`;

export const dataStream = keyframes`
  0% {
    transform: translateY(100%) opacity(0);
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100%) opacity(0);
  }
`;

// === ANIMATION VARIANTS FOR FRAMER MOTION ===

export const motionVariants = {
  // Page transitions
  pageEnter: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
  },
  
  // Card animations
  cardEnter: {
    initial: { opacity: 0, y: 30, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.98 },
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
  },
  
  // Modal animations
  modalEnter: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
  },
  
  // Achievement celebrations
  achievementCelebration: {
    initial: { scale: 0, rotate: -180, opacity: 0 },
    animate: { 
      scale: [0, 1.3, 0.9, 1.1, 1], 
      rotate: [180, 360, 540, 720, 720],
      opacity: [0, 0.8, 1, 1, 1]
    },
    transition: { duration: 0.8, ease: [0.68, -0.55, 0.265, 1.55] }
  },
  
  // Button interactions
  buttonTap: {
    whileTap: { scale: 0.98 },
    whileHover: { scale: 1.02 },
    transition: { duration: 0.1, ease: 'easeInOut' }
  },
  
  // Stagger children
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  },
  
  // Progress animations
  progressFill: {
    initial: { width: '0%' },
    animate: { width: '100%' },
    transition: { duration: 1, ease: 'easeOut' }
  },
  
  // Floating elements
  float: {
    animate: {
      y: [-2, 2, -2],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  },
  
  // Upload zone
  uploadZone: {
    initial: { borderColor: exerciseCommandTheme.colors.stellarBlue },
    hover: { 
      borderColor: exerciseCommandTheme.colors.cyberCyan,
      transition: { duration: 0.2 }
    },
    dragOver: {
      borderColor: exerciseCommandTheme.colors.exerciseGreen,
      scale: 1.02,
      transition: { duration: 0.1 }
    }
  }
};

// === RESPONSIVE ANIMATION HELPERS ===

export const responsiveAnimation = css`
  /* Reduce animations on mobile for performance */
  ${mediaQueries.mobile} {
    animation-duration: 0.2s !important;
    transition-duration: 0.2s !important;
  }
  
  /* Respect reduced motion preferences */
  ${mediaQueries.reducedMotion} {
    animation: none !important;
    transition: none !important;
  }
`;

// === PERFORMANCE OPTIMIZATION ===

export const gpuAcceleration = css`
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
  will-change: transform, opacity;
`;

export const animationPerformance = css`
  ${gpuAcceleration}
  
  /* Optimize repaints */
  contain: layout style paint;
  
  /* Improve rendering */
  isolation: isolate;
`;

// === ACCESSIBILITY HELPERS ===

export const accessibleAnimation = css`
  /* Provide fallbacks for reduced motion */
  @media (prefers-reduced-motion: reduce) {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  /* Ensure focus visibility */
  &:focus-visible {
    outline: 2px solid ${exerciseCommandTheme.colors.stellarBlue};
    outline-offset: 2px;
    animation: ${glowPulse} 1s ease-in-out infinite;
  }
`;

// === UTILITY ANIMATION MIXINS ===

export const fadeIn = css`
  animation: ${keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
  `} 0.3s ease-out;
`;

export const slideUp = css`
  animation: ${keyframes`
    from { 
      opacity: 0; 
      transform: translateY(20px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  `} 0.3s ease-out;
`;

export const scaleIn = css`
  animation: ${keyframes`
    from { 
      opacity: 0; 
      transform: scale(0.95); 
    }
    to { 
      opacity: 1; 
      transform: scale(1); 
    }
  `} 0.2s ease-out;
`;

export const rotateIn = css`
  animation: ${keyframes`
    from { 
      opacity: 0; 
      transform: rotate(-180deg) scale(0.8); 
    }
    to { 
      opacity: 1; 
      transform: rotate(0deg) scale(1); 
    }
  `} 0.4s ease-out;
`;

export default {
  // Keyframes
  achievementUnlock,
  confettiParticle,
  levelUpSequence,
  streakFlame,
  progressBarFill,
  progressRing,
  experienceGain,
  pointsCounter,
  buttonPress,
  cardHover,
  iconFloat,
  glowPulse,
  uploadPulse,
  uploadSuccess,
  dragOver,
  validationSuccess,
  validationError,
  nasmCompliance,
  spinnerRotate,
  skeletonShimmer,
  processingPulse,
  particleOrbit,
  particleTwinkle,
  dataStream,
  
  // Motion variants
  motionVariants,
  
  // Utility mixins
  responsiveAnimation,
  gpuAcceleration,
  animationPerformance,
  accessibleAnimation,
  fadeIn,
  slideUp,
  scaleIn,
  rotateIn,
};
