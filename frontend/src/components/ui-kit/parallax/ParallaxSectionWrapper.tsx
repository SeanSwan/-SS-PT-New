// frontend/src/components/ui-kit/parallax/ParallaxSectionWrapper.tsx

import React, { ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export interface ParallaxSectionWrapperProps {
  /**
   * Parallax movement speed
   * - slow: Subtle depth (200px travel)
   * - medium: Balanced depth (150px travel, default)
   * - fast: Pronounced depth (100px travel)
   */
  speed?: 'slow' | 'medium' | 'fast';

  /**
   * Make section sticky during scroll
   * Useful for hero sections or key content
   */
  sticky?: boolean;

  /**
   * Disable parallax on mobile devices
   * Improves performance and UX on small screens
   * @default true
   */
  disabledOnMobile?: boolean;

  /**
   * Provide static fallback if user prefers reduced motion
   * @default true
   */
  reduceMotionFallback?: boolean;

  /**
   * Section content
   */
  children: ReactNode;

  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * Parallax Section Wrapper Component
 *
 * Adds scroll-triggered depth effects to any section.
 * Creates layered visual hierarchy through parallax scrolling.
 *
 * **Features:**
 * - Three speed presets (slow/medium/fast)
 * - Mobile detection (auto-disable on small screens)
 * - prefers-reduced-motion support (accessibility)
 * - Uses framer-motion for smooth 60 FPS animations
 * - Powered by requestAnimationFrame (no scroll jank)
 *
 * **Performance:**
 * - Uses transform (GPU-accelerated)
 * - Automatically disabled on mobile (better UX)
 * - Respects prefers-reduced-motion (accessibility)
 * - 0 layout shifts (pure transform-based)
 *
 * **Accessibility:**
 * - Static fallback for reduced-motion users
 * - No layout shift (CLS = 0)
 * - Keyboard navigation unaffected
 *
 * @example
 * ```tsx
 * // Basic parallax section
 * <ParallaxSectionWrapper speed="medium">
 *   <FeaturesSection />
 * </ParallaxSectionWrapper>
 * ```
 *
 * @example
 * ```tsx
 * // Fast parallax with sticky behavior
 * <ParallaxSectionWrapper speed="fast" sticky>
 *   <HeroSection />
 * </ParallaxSectionWrapper>
 * ```
 *
 * @example
 * ```tsx
 * // Always enabled (even on mobile)
 * <ParallaxSectionWrapper speed="slow" disabledOnMobile={false}>
 *   <Section />
 * </ParallaxSectionWrapper>
 * ```
 */
export const ParallaxSectionWrapper: React.FC<ParallaxSectionWrapperProps> = ({
  speed = 'medium',
  sticky = false,
  disabledOnMobile = true,
  reduceMotionFallback = true,
  children,
  className
}) => {
  // Check for reduced motion preference (accessibility)
  const prefersReducedMotion = useReducedMotion();

  // Detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Get scroll progress
  const { scrollY } = useScroll();

  // Parallax transform ranges by speed
  const speedMap = {
    slow: [0, 200],   // Travels 200px over scroll range
    medium: [0, 150], // Travels 150px (default)
    fast: [0, 100]    // Travels 100px
  };

  // Transform scroll position to Y offset
  const y = useTransform(scrollY, [0, 500], speedMap[speed]);

  // Disable parallax if:
  // - User prefers reduced motion
  // - Mobile device (and disabledOnMobile is true)
  const shouldDisable =
    (reduceMotionFallback && prefersReducedMotion) ||
    (disabledOnMobile && isMobile);

  if (shouldDisable) {
    // Render without parallax (static)
    return (
      <div className={className} style={{ position: sticky ? 'sticky' : 'relative', top: 0 }}>
        {children}
      </div>
    );
  }

  // Render with parallax
  return (
    <motion.div
      className={className}
      style={{
        y,
        position: sticky ? 'sticky' : 'relative',
        top: 0
      }}
    >
      {children}
    </motion.div>
  );
};

export default ParallaxSectionWrapper;
