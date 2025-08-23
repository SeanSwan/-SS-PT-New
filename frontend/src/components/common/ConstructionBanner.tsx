/**
 * ConstructionBanner.tsx
 * =======================
 * 
 * Professional temporary banner for SwanStudios platform
 * - Galaxy Swan themed with business professional styling
 * - Informs users about site upgrades in progress
 * - Directs to contact page and orientation scheduling
 * - Subtle design that doesn't detract from main site
 * - Easy to show/hide with isVisible prop
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Calendar, Mail, X, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { galaxySwanTheme } from '../../styles/galaxy-swan-theme';

// Subtle glow animation for professional look
const subtleGlow = keyframes`
  0%, 100% {
    box-shadow: 0 2px 8px rgba(0, 255, 255, 0.1);
  }
  50% {
    box-shadow: 0 2px 12px rgba(0, 255, 255, 0.2);
  }
`;

// Styled Components
const BannerContainer = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(15, 12, 41, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
  animation: ${subtleGlow} 4s ease-in-out infinite;
  
  /* Professional glass morphism effect */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(0, 255, 255, 0.05) 25%,
      rgba(120, 81, 169, 0.05) 75%,
      transparent 100%
    );
    pointer-events: none;
  }
`;

const BannerContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    flex-direction: column;
    padding: 16px 20px;
    gap: 12px;
  }
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: ${galaxySwanTheme.primary.main};
  font-size: 1.1rem;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }
`;

const MessageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MainMessage = styled.div`
  color: ${galaxySwanTheme.text.primary};
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
    justify-content: center;
  }
`;

const SubMessage = styled.div`
  color: ${galaxySwanTheme.text.secondary};
  font-size: 0.85rem;
  font-weight: 400;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const ActionButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  
  &.primary {
    background: linear-gradient(135deg, ${galaxySwanTheme.primary.main}, ${galaxySwanTheme.primary.blue});
    color: white;
    
    &:hover {
      background: linear-gradient(135deg, ${galaxySwanTheme.primary.blue}, ${galaxySwanTheme.primary.main});
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
    }
  }
  
  &.secondary {
    background: rgba(0, 255, 255, 0.1);
    color: ${galaxySwanTheme.primary.main};
    border-color: rgba(0, 255, 255, 0.2);
    
    &:hover {
      background: rgba(0, 255, 255, 0.2);
      border-color: rgba(0, 255, 255, 0.4);
      transform: translateY(-1px);
    }
  }
  
  @media (max-width: 768px) {
    padding: 6px 12px;
    font-size: 0.8rem;
  }
`;

const CloseButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: ${galaxySwanTheme.text.secondary};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: ${galaxySwanTheme.text.primary};
  }
  
  @media (max-width: 768px) {
    position: absolute;
    top: 8px;
    right: 12px;
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
  }
`;

// Animation variants
const bannerVariants = {
  hidden: {
    y: -100,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 25,
      duration: 0.6
    }
  },
  exit: {
    y: -100,
    opacity: 0,
    transition: {
      duration: 0.4,
      ease: "easeInOut"
    }
  }
};

// Props interface
interface ConstructionBannerProps {
  isVisible?: boolean;
  onClose?: () => void;
  showCloseButton?: boolean;
  customMessage?: string;
  customSubMessage?: string;
}

const ConstructionBanner: React.FC<ConstructionBannerProps> = ({
  isVisible = true,
  onClose,
  showCloseButton = true,
  customMessage,
  customSubMessage
}) => {
  
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <BannerContainer
          variants={bannerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <BannerContent>
            <LeftSection>
              <IconContainer>
                <Wrench />
              </IconContainer>
              
              <MessageContainer>
                <MainMessage>
                  <Info size={14} />
                  {customMessage || "SwanStudios Platform Enhanced - Nearly Complete"}
                </MainMessage>
                <SubMessage>
                  {customSubMessage || "We're putting the finishing touches on your upgraded experience"}
                </SubMessage>
              </MessageContainer>
            </LeftSection>
            
            <ActionsContainer>
              <ActionButton to="/contact" className="primary">
                <Mail size={12} />
                Contact Us
              </ActionButton>
              
              <ActionButton to="/contact" className="secondary">
                <Calendar size={12} />
                Schedule Orientation
              </ActionButton>
            </ActionsContainer>
            
            {showCloseButton && (
              <CloseButton
                onClick={handleClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Close banner"
              >
                <X />
              </CloseButton>
            )}
          </BannerContent>
        </BannerContainer>
      )}
    </AnimatePresence>
  );
};

export default ConstructionBanner;