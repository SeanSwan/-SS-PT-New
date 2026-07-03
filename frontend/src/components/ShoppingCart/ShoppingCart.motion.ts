/**
 * ShoppingCart.motion.ts — framer-motion variants for the cart modal
 * ===================================================================
 * Central variants factory. When reduced motion is requested, all
 * translate/scale choreography collapses to opacity-only fades
 * (rule 25: motion must respect prefers-reduced-motion).
 */
import { useEffect, useState } from 'react';
import type { Variants } from 'framer-motion';

/** Viewport tracker feeding the motion factory's mobile bottom-sheet mode. */
export const useViewportSize = () => {
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth <= 768
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth <= 768
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewport;
};

export interface CartMotionSet {
  overlay: Variants;
  container: Variants;
  item: Variants;
  header: Variants;
  footer: Variants;
}

const fadeOnly = (duration: number): Variants => ({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration } },
  exit: { opacity: 0, transition: { duration } }
});

export const buildCartMotion = (isMobile: boolean, reduceMotion: boolean): CartMotionSet => {
  if (reduceMotion) {
    return {
      overlay: fadeOnly(0.15),
      container: fadeOnly(0.15),
      item: fadeOnly(0.15),
      header: fadeOnly(0.15),
      footer: fadeOnly(0.15)
    };
  }

  return {
    overlay: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
      exit: { opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }
    },
    container: {
      hidden: {
        opacity: 0,
        scale: isMobile ? 1 : 0.9,
        y: isMobile ? '100%' : 0
      },
      visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
          duration: 0.4,
          ease: [0.25, 0.46, 0.45, 0.94],
          staggerChildren: 0.1
        }
      },
      exit: {
        opacity: 0,
        scale: isMobile ? 1 : 0.9,
        y: isMobile ? '100%' : 0,
        transition: { duration: 0.3, ease: [0.55, 0.06, 0.68, 0.19] }
      }
    },
    item: {
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
      },
      exit: {
        opacity: 0,
        x: -30,
        scale: 0.95,
        transition: { duration: 0.3, ease: [0.55, 0.06, 0.68, 0.19] }
      }
    },
    header: {
      hidden: { opacity: 0, y: -20 },
      visible: { opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.3 } }
    },
    footer: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.3 } }
    }
  };
};
