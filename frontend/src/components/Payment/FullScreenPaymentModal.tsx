/**
 * FullScreenPaymentModal.tsx
 * ==========================
 * Full-screen, pixel-perfect mobile payment modal wrapper
 * 
 * Master Prompt v28.6 Compliance:
 * ✅ Single Responsibility: Only handles full-screen modal behavior
 * ✅ Extreme Modularity: Wraps existing GalaxyPaymentElement
 * ✅ Production-Ready: Mobile-first responsive design
 * ✅ Performance Optimized: Efficient viewport usage
 * 
 * Features:
 * - 100vh full-screen coverage on mobile
 * - Centered content with proper safe areas
 * - Touch-friendly close button
 * - Keyboard navigation support
 * - Performance-optimized animations
 */

import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import GalaxyPaymentElement from './GalaxyPaymentElement';

// Styled Components
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* Full-screen background with blur */
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  
  /* Prevent body scroll when modal is open */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  
  /* Safe area handling for mobile devices */
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  
  /* Mobile-first responsive padding */
  padding: 0;
  
  @media (min-width: 768px) {
    padding: 2rem;
  }
  
  @media (min-width: 1024px) {
    padding: 3rem;
  }
`;

const ModalContainer = styled(motion.div)`
  position: relative;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  
  /* Mobile: Full viewport coverage */
  @media (max-width: 767px) {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  /* Tablet: Slightly constrained */
  @media (min-width: 768px) and (max-width: 1023px) {
    width: 90vw;
    height: 90vh;
    max-width: 600px;
    border-radius: 20px;
    overflow-y: auto;
  }
  
  /* Desktop: Well-contained modal */
  @media (min-width: 1024px) {
    width: 80vw;
    height: 80vh;
    max-width: 700px;
    max-height: 900px;
    border-radius: 24px;
    overflow-y: auto;
  }
  
  /* Background with Galaxy theme */
  background: linear-gradient(135deg, #0a0a1a 0%, #1e1e3f 50%, #0a0a1a 100%);
  border: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 
    0 25px 50px rgba(0, 0, 0, 0.8),
    0 0 100px rgba(0, 255, 255, 0.2);
  
  /* Scrollbar styling for webkit browsers */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.3);
    border-radius: 3px;
    
    &:hover {
      background: rgba(0, 255, 255, 0.5);
    }
  }
`;

const CloseButton = styled(motion.button)`
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10001;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  /* Touch-friendly size on mobile */
  @media (max-width: 767px) {
    width: 48px;
    height: 48px;
    top: 1.5rem;
    right: 1.5rem;
  }
  
  /* Safe area considerations for mobile */
  top: max(1rem, env(safe-area-inset-top));
  right: max(1rem, env(safe-area-inset-right));
  
  &:hover {
    background: rgba(255, 0, 0, 0.2);
    border-color: rgba(255, 0, 0, 0.5);
    color: #ffffff;
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  &:focus {
    outline: 2px solid rgba(0, 255, 255, 0.5);
    outline-offset: 2px;
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const ContentWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  
  /* Mobile: Full area usage */
  @media (max-width: 767px) {
    padding: 0;
    min-height: 100vh;
  }
  
  /* Tablet and desktop: Padded content */
  @media (min-width: 768px) {
    padding: 1rem;
    min-height: auto;
  }
`;

// Animation variants
const overlayVariants = {
  hidden: { 
    opacity: 0,
    backdropFilter: 'blur(0px)'
  },
  visible: { 
    opacity: 1,
    backdropFilter: 'blur(8px)',
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

const containerVariants = {
  hidden: { 
    scale: 0.8,
    opacity: 0,
    y: 50
  },
  visible: { 
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: 0.4
    }
  },
  exit: { 
    scale: 0.8,
    opacity: 0,
    y: 50,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

const closeButtonVariants = {
  hidden: { 
    scale: 0,
    rotate: -180
  },
  visible: { 
    scale: 1,
    rotate: 0,
    transition: {
      delay: 0.2,
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  },
  exit: { 
    scale: 0,
    rotate: 180,
    transition: {
      duration: 0.15
    }
  }
};

// Component Props
interface FullScreenPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Main Component
const FullScreenPaymentModal: React.FC<FullScreenPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // Restore body scroll when modal closes
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <ModalOverlay
          ref={overlayRef}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleBackdropClick}
        >
          <ModalContainer
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()} // Prevent click-through
          >
            <CloseButton
              variants={closeButtonVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Close payment modal"
            >
              <X />
            </CloseButton>
            
            <ContentWrapper>
              <GalaxyPaymentElement
                isOpen={true}
                onClose={onClose}
                onSuccess={onSuccess}
                embedded={true} // Use embedded mode for full-screen layout
              />
            </ContentWrapper>
          </ModalContainer>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

export default FullScreenPaymentModal;