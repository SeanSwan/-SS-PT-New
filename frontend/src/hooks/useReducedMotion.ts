// frontend/src/hooks/useReducedMotion.ts

import { useState, useEffect } from 'react';

/**
 * useReducedMotion Hook
 *
 * Detects user's motion preference from system settings and provides
 * a boolean flag for accessibility-conscious animation control.
 *
 * Respects the `prefers-reduced-motion` media query, which is set by users
 * who experience motion sickness or prefer minimal animations.
 *
 * Use this hook to:
 * - Disable parallax effects
 * - Reduce animation durations to 0
 * - Skip complex WebGL/Canvas animations
 * - Provide static alternatives
 *
 * @returns {boolean} True if user prefers reduced motion
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 *
 * // Disable animation
 * const animationDuration = prefersReducedMotion ? 0 : 0.5;
 *
 * // Skip parallax
 * if (prefersReducedMotion) {
 *   return <StaticSection>{children}</StaticSection>;
 * }
 * return <ParallaxSection>{children}</ParallaxSection>;
 * ```
 *
 * @example
 * ```tsx
 * // With framer-motion
 * const prefersReducedMotion = useReducedMotion();
 *
 * <motion.div
 *   animate={{ opacity: 1 }}
 *   transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
 * >
 *   {content}
 * </motion.div>
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    // Create media query for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Handle changes to the preference
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);

      if (event.matches) {
        console.info('[useReducedMotion] User enabled reduced motion preference');
      } else {
        console.info('[useReducedMotion] User disabled reduced motion preference');
      }
    };

    // Listen for changes (user might toggle in system settings)
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * useReducedTransparency Hook
 *
 * Detects user's transparency preference from system settings.
 * Used to increase opacity of glassmorphism effects for better readability.
 *
 * @returns {boolean} True if user prefers reduced transparency
 *
 * @example
 * ```tsx
 * const prefersReducedTransparency = useReducedTransparency();
 *
 * const glassOpacity = prefersReducedTransparency ? 0.95 : theme.glass.mid;
 * const blurAmount = prefersReducedTransparency ? '0px' : '10px';
 * ```
 */
export function useReducedTransparency(): boolean {
  const [prefersReducedTransparency, setPrefersReducedTransparency] = useState<boolean>(false);

  useEffect(() => {
    // Create media query for prefers-reduced-transparency
    const mediaQuery = window.matchMedia('(prefers-reduced-transparency: reduce)');

    // Set initial value
    setPrefersReducedTransparency(mediaQuery.matches);

    // Handle changes to the preference
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedTransparency(event.matches);

      if (event.matches) {
        console.info('[useReducedTransparency] User enabled reduced transparency preference');
      } else {
        console.info('[useReducedTransparency] User disabled reduced transparency preference');
      }
    };

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedTransparency;
}
