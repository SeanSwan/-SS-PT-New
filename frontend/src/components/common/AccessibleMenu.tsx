import React, { useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import ReactDOM from 'react-dom';

interface AccessibleMenuProps {
  open: boolean;
  onClose: (event?: React.SyntheticEvent | Event, reason?: string) => void;
  anchorEl?: HTMLElement | null;
  children: React.ReactNode;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

const MenuBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1300;
`;

const MenuPaper = styled.div<{ $top: number; $left: number }>`
  position: fixed;
  top: ${props => props.$top}px;
  left: ${props => props.$left}px;
  z-index: 1301;
  min-width: 160px;
  background: rgba(20, 20, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  padding: 4px 0;
  outline: none;
  max-height: 300px;
  overflow-y: auto;
`;

/**
 * AccessibleMenu - A custom dropdown menu that replaces MUI Menu.
 * Provides proper keyboard focus management and ARIA compliance.
 */
const AccessibleMenu: React.FC<AccessibleMenuProps> = ({
  open,
  onClose,
  anchorEl,
  children,
  onKeyDown
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate position based on anchor element
  const getPosition = () => {
    if (!anchorEl) return { top: 0, left: 0 };
    const rect = anchorEl.getBoundingClientRect();
    return {
      top: rect.bottom + 4,
      left: rect.left
    };
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose?.(event, 'escapeKeyDown');
    }
    onKeyDown?.(event);
  }, [onClose, onKeyDown]);

  // Focus the menu when it opens
  useEffect(() => {
    if (open && menuRef.current) {
      menuRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const position = getPosition();

  return ReactDOM.createPortal(
    <>
      <MenuBackdrop onClick={(e) => onClose?.(e, 'backdropClick')} />
      <MenuPaper
        ref={menuRef}
        $top={position.top}
        $left={position.left}
        role="menu"
        aria-orientation="vertical"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {children}
      </MenuPaper>
    </>,
    document.body
  );
};

export default AccessibleMenu;
