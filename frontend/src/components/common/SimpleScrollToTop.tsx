// Simple, bulletproof ScrollToTop component that WILL work
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaArrowUp } from 'react-icons/fa';

const ScrollButton = styled.button<{ visible: boolean }>`
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 9999;
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(45deg, #00ffff, #7851a9);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 255, 255, 0.3);
  transition: all 0.3s ease;
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  visibility: ${({ visible }) => (visible ? 'visible' : 'hidden')};
  transform: ${({ visible }) => (visible ? 'translateY(0)' : 'translateY(20px)')};
  
  &:hover {
    transform: ${({ visible }) => (visible ? 'translateY(-5px) scale(1.1)' : 'translateY(20px)')};
    box-shadow: 0 6px 25px rgba(0, 255, 255, 0.5);
  }
  
  &:active {
    transform: ${({ visible }) => (visible ? 'translateY(-2px) scale(0.95)' : 'translateY(20px)')};
  }
  
  @media (max-width: 768px) {
    bottom: 25px;
    right: 20px;
    width: 45px;
    height: 45px;
  }
  
  @media (max-width: 480px) {
    bottom: 20px;
    right: 16px;
    width: 40px;
    height: 40px;
  }
  
  /* Ensure it's above everything */
  @media screen {
    z-index: 999999 !important;
  }
`;

const ArrowIcon = styled(FaArrowUp)`
  font-size: 18px;
  
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
    
    const toggleVisibility = () => {
      const currentScrollY = window.scrollY;
      console.log('📊 Current scroll:', currentScrollY, 'Threshold:', scrollThreshold);
      
      if (currentScrollY > scrollThreshold) {
        setIsVisible(true);
        console.log('✅ Button should be VISIBLE');
      } else {
        setIsVisible(false);
        console.log('❌ Button should be HIDDEN');
      }
    };

    // Add scroll listener
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    
    // Check initial position
    toggleVisibility();

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, [scrollThreshold]);

  const scrollToTop = () => {
    console.log('🎯 Scroll to top clicked!');
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
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