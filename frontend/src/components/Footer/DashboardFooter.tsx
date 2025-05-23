/**
 * DashboardFooter.tsx
 * ====================
 * 
 * Minimal footer component specifically for dashboard views
 * - Ultra-compact design to maximize dashboard space
 * - Contains only essential brand info and scroll-to-top
 * - Mobile-first responsive design
 * - Follows Seraphina's Digital Alchemist design principles
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronUp, FaCopyright } from 'react-icons/fa';
import GlowButton from '../Button/glowButton';
import logoImage from '../../assets/Logo.png';

// Styled Components with Digital Alchemist principles
const DashboardFooterContainer = styled(motion.footer)`
  width: 100%;
  background: rgba(15, 12, 41, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 100;
  min-height: 48px;
  
  /* Sensational glow effect */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(0, 255, 255, 0.3) 25%, 
      rgba(120, 81, 169, 0.3) 75%, 
      transparent 100%
    );
    animation: pulse 3s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.8; }
  }
  
  /* Ultra mobile responsive */
  @media (max-width: 768px) {
    padding: 6px 12px;
    min-height: 44px;
    
    /* Stack on very small screens */
    @media (max-width: 480px) {
      flex-direction: column;
      gap: 4px;
      padding: 8px 12px;
      min-height: auto;
    }
  }
`;

const BrandSection = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  
  /* Mobile optimization */
  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.65rem;
    gap: 6px;
  }
`;

const LogoImg = styled(motion.img)`
  width: 24px;
  height: 24px;
  filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.3));
  transition: all 0.3s ease;
  
  &:hover {
    filter: drop-shadow(0 0 12px rgba(0, 255, 255, 0.6));
    transform: scale(1.1);
  }
  
  @media (max-width: 768px) {
    width: 20px;
    height: 20px;
  }
  
  @media (max-width: 480px) {
    width: 18px;
    height: 18px;
  }
`;

const BrandText = styled.span`
  font-weight: 600;
  background: linear-gradient(90deg, #00ffff, #7851a9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
  
  @media (max-width: 480px) {
    display: none; /* Hide text on very small screens to save space */
  }
`;

const Copyright = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  
  svg {
    color: rgba(0, 255, 255, 0.7);
    font-size: 0.65rem;
  }
  
  @media (max-width: 768px) {
    font-size: 0.65rem;
    
    svg {
      font-size: 0.6rem;
    }
  }
  
  @media (max-width: 480px) {
    font-size: 0.6rem;
    order: 2;
  }
`;

const ScrollTopContainer = styled(motion.div)`
  position: relative;
  
  @media (max-width: 480px) {
    order: 1;
  }
`;

// Custom styled scroll-to-top button using design system principles
const ScrollTopButton = styled(motion.button)`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(0, 30, 60, 0.8);
  border: 1px solid rgba(0, 255, 255, 0.2);
  color: #00ffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.8rem;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  
  /* Glow effect on hover */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg, #00ffff, #7851a9);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
    border-color: rgba(0, 255, 255, 0.4);
    
    &::before {
      opacity: 0.6;
    }
  }
  
  &:active {
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }
  
  @media (max-width: 480px) {
    width: 26px;
    height: 26px;
    font-size: 0.7rem;
  }
`;

// Animation variants
const containerVariants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    x: -10 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

const scrollButtonVariants = {
  hidden: { 
    scale: 0, 
    opacity: 0 
  },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20
    }
  }
};

interface DashboardFooterProps {}

const DashboardFooter: React.FC<DashboardFooterProps> = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Show/hide scroll to top button based on scroll position
  useEffect(() => {
    const toggleScrollTopVisibility = () => {
      if (window.pageYOffset > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', toggleScrollTopVisibility);
    return () => window.removeEventListener('scroll', toggleScrollTopVisibility);
  }, []);

  // Smooth scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <DashboardFooterContainer
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <BrandSection variants={itemVariants}>
        <LogoImg 
          src={logoImage} 
          alt="SwanStudios Logo"
          whileHover={{ 
            scale: 1.1,
            rotate: 5
          }}
          transition={{ type: "spring", stiffness: 300 }}
        />
        <BrandText>SwanStudios</BrandText>
      </BrandSection>

      <Copyright variants={itemVariants}>
        <FaCopyright />
        <span>{new Date().getFullYear()} Swan Studios</span>
      </Copyright>

      <ScrollTopContainer>
        <AnimatePresence>
          {showScrollTop && (
            <ScrollTopButton
              onClick={scrollToTop}
              variants={scrollButtonVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Scroll to top"
            >
              <FaChevronUp />
            </ScrollTopButton>
          )}
        </AnimatePresence>
      </ScrollTopContainer>
    </DashboardFooterContainer>
  );
};

export default DashboardFooter;