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
import { X } from 'lucide-react';
import {
  Backdrop,
  CloseButton,
  DragHandle,
  MobileHeaderWrapper,
  ModalBody,
  ModalContainer,
  ModalFooter,
  ModalHeader,
} from './CustomModal.styles';

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
    <Backdrop onClick={handleBackdropClick} $isMobile={isMobile}>
      <ModalContainer
        ref={modalRef}
        $size={size}
        $isMobile={isMobile}
        $translateY={isMobile ? dragState.currentY : 0}
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
