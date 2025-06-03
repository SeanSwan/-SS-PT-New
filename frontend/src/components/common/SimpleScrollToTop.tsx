// Simple, bulletproof ScrollToTop component that WILL work
import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaArrowUp } from 'react-icons/fa';

// Cosmic glow animation
const cosmicGlow = keyframes`
  0% {
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(120, 81, 169, 0.2);
  }
  50% {
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.6), 0 0 60px rgba(120, 81, 169, 0.4);
  }
  100% {
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(120, 81, 169, 0.2);
  }
`;

// Gentle float animation
const float = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
`;

const ScrollButton = styled.button<{ visible: boolean }>`
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1050;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #00ffff 0%, #7851a9 50%, #ff2e63 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  visibility: ${({ visible }) => (visible ? 'visible' : 'hidden')};
  transform: ${({ visible }) => (visible ? 'translateY(0)' : 'translateY(20px)')};
  pointer-events: ${({ visible }) => (visible ? 'auto' : 'none')};
  
  /* Cosmic glow effect */
  animation: ${cosmicGlow} 3s ease-in-out infinite;
  
  /* Subtle border for definition */
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  /* Backdrop blur for glass effect */
  backdrop-filter: blur(10px);
  
  &:hover {
    transform: ${({ visible }) => (visible ? 'translateY(-8px) scale(1.1)' : 'translateY(20px)')};
    animation: ${cosmicGlow} 1.5s ease-in-out infinite, ${float} 2s ease-in-out infinite;
    background: linear-gradient(135deg, #00ffff 0%, #ff2e63 50%, #7851a9 100%);
  }
  
  &:active {
    transform: ${({ visible }) => (visible ? 'translateY(-4px) scale(1.05)' : 'translateY(20px)')};
  }
  
  /* Enhanced mobile positioning */
  @media (max-width: 768px) {
    bottom: 25px;
    right: 20px;
    width: 48px;
    height: 48px;
  }
  
  @media (max-width: 480px) {
    bottom: 20px;
    right: 16px;
    width: 44px;
    height: 44px;
    /* Respect mobile safe areas */
    margin-bottom: env(safe-area-inset-bottom, 0);
  }
  
  /* Landscape mobile optimization */
  @media (max-width: 768px) and (orientation: landscape) {
    bottom: 15px;
    right: 15px;
  }
  
  /* Accessibility focus ring */
  &:focus {
    outline: 3px solid #00ffff;
    outline-offset: 3px;
  }
  
  /* Ensure maximum visibility */
  @media screen {
    z-index: 1050 !important;
  }
`;

const ArrowIcon = styled(FaArrowUp)`
  font-size: 20px;
  filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.5));
  transition: transform 0.2s ease;
  
  ${ScrollButton}:hover & {
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    font-size: 18px;
  }
  
  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

interface SimpleScrollToTopProps {
  scrollThreshold?: number;
}

const SimpleScrollToTop: React.FC<SimpleScrollToTopProps> = ({ 
  scrollThreshold = 300 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    console.log('🚀 SimpleScrollToTop component mounted');
    
    let ticking = false;
    
    const toggleVisibility = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const documentHeight = document.documentElement.scrollHeight;
          const windowHeight = window.innerHeight;
          const scrollProgress = currentScrollY / (documentHeight - windowHeight);
          
          // Show button when scrolled past threshold but not at very bottom (to avoid footer overlap)
          const shouldShow = currentScrollY > scrollThreshold && scrollProgress < 0.95;
          
          console.log('📊 Scroll position:', currentScrollY, '| Threshold:', scrollThreshold, '| Show:', shouldShow);
          
          if (shouldShow !== isVisible) {
            setIsVisible(shouldShow);
            console.log(shouldShow ? '✅ Button appearing' : '❌ Button hiding');
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    // Add scroll listener with passive option for better performance
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    
    // Handle orientation changes and resizes
    const handleOrientationChange = () => {
      setTimeout(toggleVisibility, 100);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    // Check initial position
    toggleVisibility();

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, [scrollThreshold, isVisible]);

  const scrollToTop = () => {
    console.log('🎯 Cosmic scroll to top activated!');
    
    // Add haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Smooth scroll to top
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // Temporarily hide button during scroll to provide visual feedback
    setIsVisible(false);
    
    // Show button again after scroll completes
    setTimeout(() => {
      if (window.scrollY > scrollThreshold) {
        setIsVisible(true);
      }
    }, 1000);
    
    // Optional: Track analytics
    try {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'scroll_to_top', {
          page_path: window.location.pathname
        });
      }
    } catch (error) {
      // Analytics failed, but that's ok
    }
  };

  console.log('🔍 Rendering SimpleScrollToTop - Visible:', isVisible);

  return (
    <ScrollButton 
      visible={isVisible}
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Scroll to top"
    >
      <ArrowIcon />
    </ScrollButton>
  );
};

export default SimpleScrollToTop;