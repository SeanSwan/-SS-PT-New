// src/components/common/ScrollToTop.tsx
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import GlowButton from '../Button/glowButton';
import { FaArrowUp } from 'react-icons/fa';

// Styled container for positioning the scroll button
const ScrollButtonContainer = styled.div<{ visible: boolean }>`
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1000;
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  visibility: ${({ visible }) => (visible ? 'visible' : 'hidden')};
  transform: ${({ visible }) => (visible ? 'translateY(0)' : 'translateY(20px)')};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform, visibility;

  @media (max-width: 768px) {
    bottom: 20px;
    right: 20px;
  }

  @media (max-width: 480px) {
    bottom: 15px;
    right: 15px;
  }

  /* Ensure button doesn't interfere with other fixed elements */
  @media (max-width: 768px) {
    &[data-mobile-nav='true'] {
      bottom: 80px; /* Adjust if mobile nav is present */
    }
  }

  /* Accessibility enhancement */
  &:focus-within {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    border-radius: 8px;
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

  // Handle scroll visibility logic
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const shouldShow = currentScrollY > scrollThreshold;
      
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
    };

    // Add scroll event listener with passive option for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check
    handleScroll();

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [scrollThreshold]);

  // Handle click to scroll to top
  const handleScrollToTop = () => {
    // Execute callback if provided
    if (onScrollToTop) {
      onScrollToTop();
    }

    // Scroll to top with specified behavior
    window.scrollTo({
      top: 0,
      behavior: scrollBehavior,
    });

    // Optional: Briefly hide button during scroll animation
    if (scrollBehavior === 'smooth') {
      setIsScrolling(true);
      setTimeout(() => {
        setIsScrolling(false);
      }, 500);
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