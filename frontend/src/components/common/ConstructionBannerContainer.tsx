/**
 * ConstructionBannerContainer.tsx
 * ===============================
 * 
 * Container version of the construction banner for placement between header and content
 * - Galaxy Swan themed with business professional styling
 * - Part of document flow (not fixed positioned)
 * - Responsive design for all devices
 * - Easy to show/hide across entire site
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
  width: 100%;
  background: rgba(15, 12, 41, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
  animation: ${subtleGlow} 4s ease-in-out infinite;
  position: relative;
  z-index: 100;
  
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
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    flex-direction: column;
    padding: 20px;
    gap: 16px;
  }
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: ${galaxySwanTheme.primary.main};
  font-size: 1.2rem;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    font-size: 1.1rem;
  }
`;

const MessageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const MainMessage = styled.div`
  color: ${galaxySwanTheme.text.primary};
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    justify-content: center;
  }
`;

const SubMessage = styled.div`
  color: ${galaxySwanTheme.text.secondary};
  font-size: 0.9rem;
  font-weight: 400;
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
  }
`;

const ActionButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  
  &.primary {
    background: linear-gradient(135deg, ${galaxySwanTheme.primary.main}, ${galaxySwanTheme.primary.blue});
    color: white;
    
    &:hover {
      background: linear-gradient(135deg, ${galaxySwanTheme.primary.blue}, ${galaxySwanTheme.primary.main});
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 255, 255, 0.4);
    }
  }
  
  &.secondary {
    background: rgba(0, 255, 255, 0.1);
    color: ${galaxySwanTheme.primary.main};
    border-color: rgba(0, 255, 255, 0.3);
    
    &:hover {
      background: rgba(0, 255, 255, 0.2);
      border-color: rgba(0, 255, 255, 0.5);
      transform: translateY(-2px);
    }
  }
  
  @media (max-width: 768px) {
    padding: 8px 16px;
    font-size: 0.85rem;
  }
`;

const CloseButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: ${galaxySwanTheme.text.secondary};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: ${galaxySwanTheme.text.primary};
  }
  
  @media (max-width: 768px) {
    position: absolute;
    top: 12px;
    right: 16px;
    width: 32px;
    height: 32px;
    font-size: 0.9rem;
  }
`;

// Animation variants
const bannerVariants = {
  hidden: {
    height: 0,
    opacity: 0,
  },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: {
        duration: 0.4,
        ease: "easeOut"
      },
      opacity: {
        duration: 0.3,
        delay: 0.1
      }
    }
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      height: {
        duration: 0.3,
        delay: 0.1
      },
      opacity: {
        duration: 0.2
      }
    }
  }
};

// Props interface
interface ConstructionBannerContainerProps {
  isVisible?: boolean;
  onClose?: () => void;
  showCloseButton?: boolean;
  customMessage?: string;
  customSubMessage?: string;
}

const ConstructionBannerContainer: React.FC<ConstructionBannerContainerProps> = ({
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
                  <Info size={16} />
                  {customMessage || "SwanStudios Platform Enhanced - Nearly Complete"}
                </MainMessage>
                <SubMessage>
                  {customSubMessage || "We're putting the finishing touches on your upgraded experience"}
                </SubMessage>
              </MessageContainer>
            </LeftSection>
            
            <ActionsContainer>
              <ActionButton to="/contact" className="primary">
                <Mail size={14} />
                Contact Us
              </ActionButton>
              
              <ActionButton to="/contact" className="secondary">
                <Calendar size={14} />
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

export default ConstructionBannerContainer;