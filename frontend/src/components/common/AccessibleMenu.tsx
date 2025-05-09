import React from 'react';
import { Menu, MenuProps, styled } from '@mui/material';

/**
 * AccessibleMenu is a wrapper around MUI Menu that fixes accessibility issues
 * by preventing aria-hidden from being applied to elements containing focus.
 * 
 * This component uses custom props to ensure proper keyboard focus management
 * and ARIA compliance.
 */
const AccessibleMenu = styled((props: MenuProps) => (
  <Menu
    {...props}
    // Override the Menu's slotProps to ensure proper accessibility
    slotProps={{
      ...props.slotProps,
      paper: {
        ...props.slotProps?.paper,
        // Don't use aria-hidden on the menu paper element
        'aria-hidden': undefined,
      },
    }}
    // You can add other accessibility attributes here
    tabIndex={-1}
  />
))(({ theme }) => ({
  // Style overrides if needed
  '& .MuiPaper-root': {
    outline: 'none',
  },
}));

export default AccessibleMenu;