/**
 * HighContrastToggle.tsx
 * 
 * A component for toggling high contrast mode to improve accessibility
 * for users with visual impairments and color perception issues
 */

import React, { useState, useEffect } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

// Local storage key for saving preference
const HIGH_CONTRAST_KEY = 'schedule_high_contrast_mode';

// Global styles applied when high contrast mode is enabled
const HighContrastGlobalStyle = createGlobalStyle`
  /* Calendar specific high contrast overrides */
  .rbc-calendar {
    background: #000 !important;
    border: 2px solid #fff !important;
  }

  .rbc-header {
    background: #000 !important;
    color: #fff !important;
    border: 2px solid #fff !important;
    font-weight: bold !important;
  }

  .rbc-toolbar {
    background: #000 !important;
    border: 2px solid #fff !important;
  }

  .rbc-toolbar-label {
    color: #fff !important;
    font-weight: bold !important;
  }

  .rbc-btn-group button {
    background: #000 !important;
    color: #fff !important;
    border: 2px solid #fff !important;
    font-weight: bold !important;
  }

  .rbc-btn-group button.rbc-active {
    background: #fff !important;
    color: #000 !important;
    font-weight: bold !important;
  }

  .rbc-today {
    background: #333 !important;
  }

  .rbc-event.available {
    background: #fff !important;
    color: #000 !important;
    border: 2px solid #000 !important;
    font-weight: bold !important;
  }

  .rbc-event.booked {
    background: #666 !important;
    color: #fff !important;
    border: 2px solid #fff !important;
    font-weight: bold !important;
  }

  .rbc-event.confirmed {
    background: #aaa !important;
    color: #000 !important;
    border: 2px solid #000 !important;
    font-weight: bold !important;
  }

  .rbc-event.completed {
    background: #fff !important;
    color: #000 !important;
    border: 3px dashed #000 !important;
    font-weight: bold !important;
  }

  .rbc-event.cancelled {
    background: #333 !important;
    color: #fff !important;
    border: 2px solid #fff !important;
    text-decoration: line-through !important;
    font-weight: bold !important;
  }

  /* Other UI components in high contrast */
  .stat-card {
    background: #000 !important;
    border: 2px solid #fff !important;
  }

  .stat-label {
    color: #fff !important;
    font-weight: bold !important;
  }

  .stat-value {
    color: #fff !important;
    background: transparent !important;
    -webkit-text-fill-color: #fff !important;
    font-weight: bold !important;
  }

  /* Modal high contrast */
  .modal-content {
    background: #000 !important;
    border: 2px solid #fff !important;
  }

  .modal-content h2,
  .modal-content label,
  .modal-content p {
    color: #fff !important;
  }

  .modal-content input,
  .modal-content select,
  .modal-content textarea {
    background: #000 !important;
    color: #fff !important;
    border: 2px solid #fff !important;
  }

  /* Focus styles for better keyboard navigation */
  *:focus {
    outline: 3px solid #fff !important;
    outline-offset: 2px !important;
  }
`;

// The toggle button styling
const ToggleButton = styled(IconButton)`
  &.MuiIconButton-root {
    position: absolute;
    top: 10px;
    right: 70px;
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    
    &:hover {
      background: rgba(0, 0, 0, 0.7);
    }
  }
`;

const HighContrastToggle: React.FC = () => {
  // Initialize state from local storage or default to false
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    const saved = localStorage.getItem(HIGH_CONTRAST_KEY);
    return saved === 'true';
  });

  // Update localStorage when preference changes
  useEffect(() => {
    localStorage.setItem(HIGH_CONTRAST_KEY, highContrast.toString());
  }, [highContrast]);

  // Toggle high contrast mode
  const toggleHighContrast = () => {
    setHighContrast(prev => !prev);
  };

  return (
    <>
      {/* Conditionally apply global styles */}
      {highContrast && <HighContrastGlobalStyle />}
      
      {/* Toggle button with appropriate tooltip */}
      <Tooltip 
        title={highContrast ? "Disable high contrast mode" : "Enable high contrast mode"}
        placement="bottom"
      >
        <ToggleButton
          onClick={toggleHighContrast}
          aria-pressed={highContrast}
          aria-label={highContrast ? "Disable high contrast mode" : "Enable high contrast mode"}
        >
          {highContrast ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </ToggleButton>
      </Tooltip>
    </>
  );
};

export default HighContrastToggle;
