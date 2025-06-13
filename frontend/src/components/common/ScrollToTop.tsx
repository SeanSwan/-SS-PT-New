// src/components/common/ScrollToTop.tsx
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import GlowButton from '../ui/buttons/GlowButton';
import { FaArrowUp } from 'react-icons/fa';

// Styled container for positioning the scroll button
const ScrollButtonContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'visible',
})<{ visible: boolean }>`
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1050; /* Higher than header (1000) and footer scroll button */
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  visibility: ${({ visible }) => (visible ? 'visible' : 'hidden')};
  transform: ${({ visible }) => (visible ? 'translateY(0)' : 'translateY(20px)')};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform, visibility;
  pointer-events: ${({ visible }) => (visible ? 'auto' : 'none')};

  /* Enhanced mobile positioning - avoid mobile navigation areas */
  @media (max-width: 768px) {
    bottom: 25px;
    right: 20px;
  }

  @media (max-width: 480px) {
    bottom: 20px;
    right: 16px;
    /* Ensure it's above mobile browser UI */
    margin-bottom: env(safe-area-inset-bottom, 0);
  }

  /* Avoid interference with mobile navigation bars */
  @media (max-width: 768px) and (orientation: portrait) {
    bottom: 30px; /* Higher on mobile to avoid thumb reach interference */
  }

  /* Landscape mobile optimization */
  @media (max-width: 768px) and (orientation: landscape) {
    bottom: 15px;
    right: 15px;
  }

  /* Accessibility enhancements */
  &:focus-within {
    outline: 3px solid #00a0e3;
    outline-offset: 2px;
    border-radius: 50%;
  }

  /* Hover state for better UX */
  &:hover {
    transform: ${({ visible }) => (visible ? 'translateY(-5px)' : 'translateY(20px)')};
  }
`;

// Props interface for ScrollToTop component
interface ScrollToTopProps {
  /** Scroll threshold in pixels before button appears */
  scrollThreshold?: number;
  /** Theme for the glow button */
  theme?: 'purple' | 'emerald' | 'ruby' | 'cosmic';
  /** Size of the button */
  size?: 'small' | 'medium' | 'large';
  /** Custom scroll behavior */
  scrollBehavior?: 'smooth' | 'auto';
  /** Custom icon (defaults to up arrow) */
  icon?: React.ReactNode;
  /** Custom aria-label for accessibility */
  ariaLabel?: string;
  /** Callback function when scroll to top is triggered */
  onScrollToTop?: () => void;
}

/**
 * ScrollToTop Component
 * A floating scroll-to-top button that appears when user scrolls down
 * Uses the GlowButton component for consistent styling
 */
const ScrollToTop: React.FC<ScrollToTopProps> = ({
  scrollThreshold = 400,
  theme = 'cosmic',
  size = 'medium',
  scrollBehavior = 'smooth',
  icon = <FaArrowUp size={18} />,
  ariaLabel = 'Scroll to top of page',
  onScrollToTop,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // Handle scroll visibility logic with enhanced mobile detection
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const documentHeight = document.documentElement.scrollHeight;
          const windowHeight = window.innerHeight;
          const scrollProgress = currentScrollY / (documentHeight - windowHeight);
          
          // Show button when scrolled past threshold but not at the very bottom
          // (to avoid overlap with footer elements)
          const shouldShow = currentScrollY > scrollThreshold && scrollProgress < 0.95;
          
          setIsVisible(shouldShow);
          setIsScrolling(true);

          // Clear existing timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          // Set scrolling to false after scroll stops
          timeoutId = setTimeout(() => {
            setIsScrolling(false);
          }, 150);
          
          ticking = false;
        });
        ticking = true;
      }
    };

    // Add scroll event listener with passive option for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Handle orientation changes on mobile
    const handleOrientationChange = () => {
      setTimeout(handleScroll, 100); // Small delay to allow for layout changes
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    // Initial check
    handleScroll();

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [scrollThreshold]);

  // Handle click to scroll to top with enhanced feedback
  const handleScrollToTop = () => {
    try {
      // Execute callback if provided
      if (onScrollToTop) {
        onScrollToTop();
      }

      // Provide immediate visual feedback
      setIsScrolling(true);

      // Focus management for accessibility
      const currentFocus = document.activeElement;
      
      // Scroll to top with specified behavior
      window.scrollTo({
        top: 0,
        behavior: scrollBehavior,
      });

      // Handle different scroll behaviors
      if (scrollBehavior === 'smooth') {
        // For smooth scroll, wait for animation to complete
        const scrollDuration = 500;
        setTimeout(() => {
          setIsScrolling(false);
          // Return focus to the body or first focusable element
          if (currentFocus && currentFocus !== document.body) {
            (currentFocus as HTMLElement).blur();
          }
          // Announce to screen readers
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'polite');
          announcement.setAttribute('aria-atomic', 'true');
          announcement.style.position = 'absolute';
          announcement.style.left = '-10000px';
          announcement.textContent = 'Scrolled to top of page';
          document.body.appendChild(announcement);
          setTimeout(() => {
            document.body.removeChild(announcement);
          }, 1000);
        }, scrollDuration);
      } else {
        // For instant scroll, immediate feedback
        setTimeout(() => {
          setIsScrolling(false);
        }, 100);
      }
    } catch (error) {
      console.warn('Error during scroll to top:', error);
      // Fallback - try without smooth behavior
      window.scrollTo(0, 0);
      setIsScrolling(false);
    }
  };

  // Don't render if not visible
  if (!isVisible && !isScrolling) {
    return null;
  }

  return (
    <ScrollButtonContainer 
      visible={isVisible}
      role="complementary"
      aria-label="Scroll to top section"
    >
      <GlowButton
        text=""
        theme={theme}
        size={size}
        onClick={handleScrollToTop}
        leftIcon={icon}
        animateOnRender={false}
        aria-label={ariaLabel}
        title={ariaLabel}
        style={{
          borderRadius: '50%',
          width: size === 'small' ? '48px' : size === 'medium' ? '56px' : '64px',
          height: size === 'small' ? '48px' : size === 'medium' ? '56px' : '64px',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    </ScrollButtonContainer>
  );
};

export default ScrollToTop;