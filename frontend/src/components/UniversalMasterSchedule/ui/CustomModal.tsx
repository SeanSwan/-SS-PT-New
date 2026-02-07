/**
 * Custom Modal Component - Mobile Bottom Sheet Edition
 * =====================================================
 * Fully accessible modal dialog with mobile bottom sheet UX pattern
 *
 * Features:
 * - Desktop: Centered modal with backdrop
 * - Mobile: Bottom sheet with drag-to-dismiss
 * - Focus trap (focus stays within modal)
 * - ESC key to close
 * - Click backdrop to close
 * - Return focus to trigger element
 * - ARIA attributes for accessibility
 * - Smooth animations
 * - iOS safe area support
 * - Touch-optimized 44px targets
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, css } from 'styled-components';
import { X } from 'lucide-react';
import { IconButton } from './StyledButton';

// Animations
const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideUpFromBottom = keyframes`
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
`;

// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 480);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Backdrop - Ultra responsive
const Backdrop = styled.div<{ isMobile?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  z-index: 1300;
  display: flex;
  align-items: ${props => props.isMobile ? 'flex-end' : 'flex-start'};
  justify-content: center;
  padding: ${props => props.isMobile ? '0' : '1rem'};
  animation: ${fadeIn} 0.2s ease;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

// Drag handle for mobile bottom sheet
const DragHandle = styled.div`
  width: 36px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  margin: 0 auto 0.5rem;
  flex-shrink: 0;

  @media (min-width: 481px) {
    display: none;
  }
`;

// Modal container - Ultra responsive
const ModalContainer = styled.div<{
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isMobile?: boolean;
  translateY?: number;
}>`
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  max-width: ${props => {
    switch (props.size) {
      case 'sm': return '400px';
      case 'lg': return '800px';
      case 'xl': return '1200px';
      default: return '600px'; // md
    }
  }};
  width: 100%;
  margin: auto;
  display: flex;
  flex-direction: column;
  animation: ${slideUp} 0.3s ease;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  position: relative;

  /* Tablet */
  @media (max-width: 768px) {
    max-width: 95%;
    max-height: 92vh;
    border-radius: 16px;
  }

  /* Mobile: Bottom Sheet Pattern */
  @media (max-width: 480px) {
    max-width: 100%;
    max-height: 90vh;
    min-height: 40vh;
    border-radius: 20px 20px 0 0;
    margin: 0;
    animation: ${slideUpFromBottom} 0.3s cubic-bezier(0.32, 0.72, 0, 1);
    transform: ${props => props.translateY ? `translateY(${props.translateY}px)` : 'translateY(0)'};
    transition: transform 0.1s ease-out;
    /* iOS safe area */
    padding-bottom: env(safe-area-inset-bottom, 0);
    padding-bottom: max(env(safe-area-inset-bottom, 0), 0.5rem);
  }
`;

// Mobile header wrapper with drag zone
const MobileHeaderWrapper = styled.div`
  @media (max-width: 480px) {
    padding-top: 0.5rem;
    touch-action: none; /* Prevent browser scrolling while dragging */
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }
`;

// Modal header - Ultra responsive
const ModalHeader = styled.div`
  padding: 1.5rem;
  padding-right: 3.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 500;
    color: #ffffff;
  }

  @media (max-width: 768px) {
    padding: 1.25rem;
    padding-right: 3rem;

    h2 {
      font-size: 1.25rem;
    }
  }

  @media (max-width: 480px) {
    padding: 0.75rem 1rem;
    padding-right: 2.5rem;

    h2 {
      font-size: 1.1rem;
    }
  }
`;

// Modal body - Ultra responsive with overflow for dropdowns
const ModalBody = styled.div`
  padding: 1.5rem;
  padding-bottom: 2rem;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  position: relative;
  min-height: 100px;
  -webkit-overflow-scrolling: touch;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }

  @media (max-width: 768px) {
    padding: 1.25rem;
  }

  @media (max-width: 480px) {
    padding: 1rem;
    /* Ensure content doesn't get cut off */
    padding-bottom: 1.5rem;
  }
`;

// Modal footer - Ultra responsive
const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 0.75rem;
  }

  @media (max-width: 480px) {
    padding: 0.75rem 1rem;
    flex-direction: column-reverse;
    gap: 0.5rem;
    /* iOS safe area */
    padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0));

    button {
      width: 100%;
      justify-content: center;
      min-height: 44px; /* Touch target */
    }
  }
`;

// Close button (positioned absolutely with high z-index) - Ultra responsive
const CloseButton = styled(IconButton)`
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  background: rgba(0, 0, 0, 0.3);
  min-width: 36px;
  min-height: 36px;

  &:hover {
    background: rgba(239, 68, 68, 0.3);
  }

  /* Better touch target on mobile */
  @media (max-width: 768px) {
    top: 0.75rem;
    right: 0.75rem;
    min-width: 40px;
    min-height: 40px;
  }

  @media (max-width: 480px) {
    top: calc(0.5rem + 4px); /* Account for drag handle */
    right: 0.75rem;
    min-width: 44px;
    min-height: 44px;
    padding: 0.625rem;
  }
`;

// Props interface
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const titleId = ariaLabelledby || 'modal-title';
  const isMobile = useIsMobile();

  // Drag state for mobile bottom sheet
  const [dragState, setDragState] = useState({
    isDragging: false,
    startY: 0,
    currentY: 0
  });

  // Store the previously focused element
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTab);
    return () => modal.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // ESC key handler
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, closeOnEsc, onClose]);

  // Return focus when modal closes
  useEffect(() => {
    if (!isOpen && previouslyFocusedElement.current) {
      previouslyFocusedElement.current.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Prevent iOS bounce
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  }, [closeOnBackdropClick, onClose]);

  // Mobile drag handlers for swipe-to-dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    setDragState({
      isDragging: true,
      startY: e.touches[0].clientY,
      currentY: 0
    });
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragState.isDragging || !isMobile) return;
    const deltaY = e.touches[0].clientY - dragState.startY;
    // Only allow dragging down
    if (deltaY > 0) {
      setDragState(prev => ({ ...prev, currentY: deltaY }));
    }
  }, [dragState.isDragging, dragState.startY, isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile) return;
    // If dragged more than 100px, close the modal
    if (dragState.currentY > 100) {
      onClose();
    }
    setDragState({ isDragging: false, startY: 0, currentY: 0 });
  }, [dragState.currentY, onClose, isMobile]);

  if (!isOpen) return null;

  const modalContent = (
    <Backdrop onClick={handleBackdropClick} isMobile={isMobile}>
      <ModalContainer
        ref={modalRef}
        size={size}
        isMobile={isMobile}
        translateY={isMobile ? dragState.currentY : 0}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={ariaDescribedby}
      >
        {showCloseButton && (
          <CloseButton
            onClick={onClose}
            aria-label="Close modal"
            size="medium"
          >
            <X size={20} />
          </CloseButton>
        )}

        {/* Mobile: Drag handle zone */}
        {isMobile && (
          <MobileHeaderWrapper
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <DragHandle />
            {title && (
              <ModalHeader>
                <h2 id={titleId}>{title}</h2>
              </ModalHeader>
            )}
          </MobileHeaderWrapper>
        )}

        {/* Desktop: Normal header */}
        {!isMobile && title && (
          <ModalHeader>
            <h2 id={titleId}>{title}</h2>
          </ModalHeader>
        )}

        <ModalBody>
          {children}
        </ModalBody>

        {footer && (
          <ModalFooter>
            {footer}
          </ModalFooter>
        )}
      </ModalContainer>
    </Backdrop>
  );

  // Render in portal
  return createPortal(modalContent, document.body);
};

// Export styled components for custom modal layouts
export { ModalHeader, ModalBody, ModalFooter };
export default Modal;
