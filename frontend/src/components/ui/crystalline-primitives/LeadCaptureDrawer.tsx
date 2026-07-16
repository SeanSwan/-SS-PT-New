/**
 * LeadCaptureDrawer — Slide-up glass drawer for CRM lead capture
 * Mobile: bottom-sheet drawer · Desktop: side panel
 * Blurs underlying gallery photo to maintain emotional connection
 * Non-intrusive — slides up after engagement threshold, not immediately
 */
import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 32, 96, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 90;
`;

const DrawerPanel = styled(motion.div)`
  position: fixed;
  z-index: 95;

  /* Mobile: bottom sheet */
  bottom: 0;
  left: 0;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  background: linear-gradient(180deg, rgba(0, 48, 128, 0.95) 0%, rgba(0, 32, 96, 1) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 24px 24px 0 0;
  padding: 32px 24px;
  box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.5);

  /* Desktop: side panel */
  @media (min-width: 1024px) {
    top: 0;
    bottom: 0;
    right: 0;
    left: auto;
    width: 420px;
    max-height: 100vh;
    border-radius: 0;
    border-top: none;
    border-left: 1px solid rgba(96, 192, 240, 0.15);
    padding: 48px 32px;
    box-shadow: -20px 0 60px rgba(0, 0, 0, 0.5);
  }

  @media (max-width: 430px) {
    padding: 24px 16px;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  @supports not (backdrop-filter: blur(24px)) {
    background: rgba(0, 32, 96, 0.98);
  }
`;

const DrawerTitle = styled.h3`
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  font-weight: 300;
  letter-spacing: -0.02em;
  color: #E0ECF4;
  margin: 0 0 8px 0;
`;

const DrawerSubtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  color: rgba(224, 236, 244, 0.6);
  margin: 0 0 24px 0;
  line-height: 1.5;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 44px;
  height: 44px;
  background: transparent;
  border: 1px solid rgba(224, 236, 244, 0.15);
  border-radius: 50%;
  color: #E0ECF4;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba(96, 192, 240, 0.4);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

interface LeadCaptureDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const LeadCaptureDrawer: React.FC<LeadCaptureDrawerProps> = ({
  isOpen,
  onClose,
  title = 'Unlock Your Gallery',
  subtitle = 'Enter your details to access full-resolution downloads and exclusive enhancement offers.',
  children,
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={onClose}
        />
        <DrawerPanel
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <CloseButton onClick={onClose} aria-label="Close">
            ✕
          </CloseButton>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerSubtitle>{subtitle}</DrawerSubtitle>
          {children}
        </DrawerPanel>
      </>
    )}
  </AnimatePresence>
);
