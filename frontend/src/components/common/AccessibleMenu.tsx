import React, { useEffect, useRef } from 'react';
import { Menu, MenuProps, styled } from '@mui/material';

/**
 * AccessibleMenu is a wrapper around MUI Menu that fixes accessibility issues
 * by preventing aria-hidden from being applied to elements containing focus.
 * 
 * This component uses custom props to ensure proper keyboard focus management
 * and ARIA compliance.
 */
const AccessibleMenuBase = React.forwardRef<HTMLDivElement, MenuProps>((props, ref) => {
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Use the provided ref or our own
  const internalRef = ref || menuRef;
  
  useEffect(() => {
    if (props.open && internalRef && 'current' in internalRef && internalRef.current) {
      // Find the backdrop element
      const backdrop = internalRef.current.querySelector('.MuiModal-backdrop');
      if (backdrop) {
        // Remove aria-hidden to prevent accessibility issues
        backdrop.removeAttribute('aria-hidden');
      }
      
      // Find the popover root and remove aria-hidden
      const popoverRoot = internalRef.current.querySelector('.MuiPopover-root');
      if (popoverRoot) {
        popoverRoot.removeAttribute('aria-hidden');
      }
    }
  }, [props.open, internalRef]);
  
  return (
    <Menu
      {...props}
      ref={internalRef}
      // Override the Menu's slotProps to ensure proper accessibility
      slotProps={{
        ...props.slotProps,
        paper: {
          ...props.slotProps?.paper,
          // Ensure proper focus management
          role: 'menu',
          'aria-orientation': 'vertical',
        },
        backdrop: {
          ...props.slotProps?.backdrop,
          // Remove aria-hidden from backdrop
          'aria-hidden': 'false',
        },
      }}
      // Ensure proper keyboard handling
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          props.onClose?.(event, 'escapeKeyDown');
        }
        props.onKeyDown?.(event);
      }}
      // You can add other accessibility attributes here
      tabIndex={-1}
    />
  );
});

const AccessibleMenu = styled(AccessibleMenuBase)(({ theme }) => ({
  // Style overrides if needed
  '& .MuiPaper-root': {
    outline: 'none',
  },
  // Ensure backdrop doesn't interfere with accessibility
  '& .MuiModal-backdrop': {
    // Override any conflicting styles
    pointerEvents: 'auto',
  },
}));

export default AccessibleMenu;