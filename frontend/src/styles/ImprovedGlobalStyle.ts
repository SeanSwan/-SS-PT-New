/**
 * ImprovedGlobalStyle.ts
 * =====================
 * Enhanced global styling with improved accessibility, responsiveness,
 * and consistent styling across the application
 */

import { createGlobalStyle } from 'styled-components';

const ImprovedGlobalStyle = createGlobalStyle`
  /* Reset and base styles */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  /* Modern CSS focus styles - improved accessibility */
  :focus-visible {
    outline: 3px solid #00ffff;
    outline-offset: 3px;
    box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.5);
  }
  
  /* Base HTML/Body styling with smooth scrolling */
  html {
    font-size: 16px;
    scroll-behavior: smooth;
    height: 100%;
    width: 100%;
    -webkit-text-size-adjust: 100%;
  }
  
  body, html {
    font-family: 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
    color: white;
    min-height: 100vh;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    line-height: 1.5;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  /* Main root container */
  #root {
    background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
    min-height: 100vh;
    width: 100%;
    isolation: isolate;
    position: relative;
  }
  
  /* Improved typography with responsive scaling */
  h1, h2, h3, h4, h5, h6 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    font-weight: 600;
    line-height: 1.2;
    color: white;
  }
  
  h1 { font-size: clamp(2rem, 5vw, 3rem); }
  h2 { font-size: clamp(1.75rem, 4vw, 2.5rem); }
  h3 { font-size: clamp(1.5rem, 3vw, 2rem); }
  h4 { font-size: clamp(1.25rem, 2.5vw, 1.75rem); }
  h5 { font-size: clamp(1.1rem, 2vw, 1.5rem); }
  h6 { font-size: clamp(1rem, 1.5vw, 1.25rem); }
  
  p {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1rem;
    line-height: 1.6;
  }
  
  /* Responsive container */
  .container {
    width: 100%;
    padding-right: clamp(1rem, 5vw, 2rem);
    padding-left: clamp(1rem, 5vw, 2rem);
    margin-right: auto;
    margin-left: auto;
    max-width: 1440px;
  }
  
  /* Links styling with accessible focus states */
  a {
    color: #00ffff;
    text-decoration: none;
    transition: color 0.2s ease, text-decoration 0.2s ease;
    
    &:hover {
      color: #7eeeee;
      text-decoration: underline;
    }
    
    &:focus-visible {
      outline: 3px solid #00ffff;
      outline-offset: 3px;
    }
  }
  
  /* Form elements with improved accessibility */
  button, 
  input, 
  select, 
  textarea {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    margin: 0;
  }
  
  button,
  input {
    overflow: visible;
  }
  
  button,
  select {
    text-transform: none;
  }
  
  /* MUI Paper components */
  .MuiPaper-root {
    background-color: rgba(30, 30, 60, 0.3) !important;
    backdrop-filter: blur(10px) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: white !important;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3) !important;
  }
  
  /* App Bar styling */
  .MuiAppBar-root {
    background-color: rgba(10, 10, 30, 0.7) !important;
    backdrop-filter: blur(10px) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  }

  /* Dialog, Popover, Drawer, etc */
  .MuiDialog-paper,
  .MuiPopover-paper,
  .MuiDrawer-paper,
  .MuiMenu-paper,
  .MuiAlert-root,
  .MuiDataGrid-root,
  .MuiDataGrid-cell,
  .MuiDataGrid-columnHeaders,
  .MuiDataGrid-columnHeader,
  .MuiDataGrid-row,
  .MuiDataGrid-footer {
    background-color: rgba(20, 20, 40, 0.7) !important;
    color: white !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }

  /* Hover states for DataGrid, Table, etc */
  .MuiDataGrid-row:hover,
  .MuiTableRow-root:hover,
  .MuiMenuItem-root:hover,
  .MuiListItem-root:hover {
    background-color: rgba(255, 255, 255, 0.05) !important;
  }

  /* Input field styling with improved focus states */
  .MuiInputBase-root,
  .MuiOutlinedInput-root,
  .MuiTextField-root,
  .MuiSelect-root,
  .MuiAutocomplete-root {
    background-color: rgba(40, 40, 80, 0.4) !important;
    color: white !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
    
    &:focus-within {
      border-color: rgba(0, 255, 255, 0.6) !important;
      box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.3) !important;
    }
  }

  .MuiInputBase-root input,
  .MuiOutlinedInput-root input,
  .MuiTextField-root input,
  .MuiSelect-root input,
  .MuiAutocomplete-root input {
    color: white !important;
  }

  /* Label styling */
  .MuiInputLabel-root,
  .MuiFormLabel-root,
  .MuiFormControlLabel-label {
    color: rgba(255, 255, 255, 0.8) !important;
  }

  /* Button styling with improved focus states */
  .MuiButton-root,
  .MuiIconButton-root {
    background-color: rgba(40, 40, 100, 0.4) !important;
    color: white !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    transition: all 0.2s ease-in-out !important;
    
    &:hover {
      background-color: rgba(60, 60, 140, 0.6) !important;
      border-color: rgba(255, 255, 255, 0.4) !important;
    }
    
    &:focus-visible {
      outline: 3px solid #00ffff !important;
      outline-offset: 2px !important;
    }
  }

  /* Tab styling */
  .MuiTab-root {
    color: rgba(255, 255, 255, 0.7) !important;
    
    &.Mui-selected {
      color: #00ffff !important;
    }
    
    &:focus-visible {
      outline: 3px solid rgba(0, 255, 255, 0.5) !important;
      outline-offset: -2px !important;
    }
  }

  /* Login form specific adjustments */
  .login-form .MuiPaper-root,
  .signup-form .MuiPaper-root {
    background-color: rgba(30, 30, 60, 0.3) !important;
    backdrop-filter: blur(10px) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    
    @media (max-width: 600px) {
      width: 90% !important;
      max-width: 400px !important;
      margin: 20px auto !important;
      padding: 16px !important;
    }
  }

  /* Chart styling */
  .recharts-layer, 
  .recharts-surface,
  .recharts-wrapper,
  .recharts-legend-wrapper {
    color: white !important;
    background-color: transparent !important;
  }

  /* Card content styling */
  .MuiCardContent-root {
    background-color: rgba(30, 30, 60, 0.5) !important;
    padding: clamp(12px, 3vw, 24px) !important;
  }

  /* Table header styling */
  .MuiTableHead-root th {
    background-color: rgba(20, 20, 50, 0.7) !important;
    font-weight: bold !important;
  }

  /* Admin Dashboard Stats Card Styles - with improved responsive design */
  .admin-stats-card {
    display: flex;
    align-items: center;
    background: rgba(30, 30, 60, 0.5);
    border-radius: 12px;
    padding: clamp(0.75rem, 3vw, 1.25rem);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
    height: 100%;
    
    @media (max-width: 768px) {
      flex-direction: column;
      text-align: center;
    }
    
    &:hover {
      transform: translateY(-5px);
      border-color: rgba(255, 255, 255, 0.2);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    }
  }

  .admin-stats-card .stats-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 1rem;
    
    @media (max-width: 768px) {
      margin-right: 0;
      margin-bottom: 0.75rem;
    }
  }

  .admin-stats-card .stats-content {
    flex: 1;
  }

  .admin-stats-card .stats-title {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 0.25rem 0;
  }

  .admin-stats-card .stats-value {
    font-size: clamp(1.25rem, 3vw, 1.5rem);
    font-weight: 500;
    margin: 0;
    color: white;
  }

  .admin-stats-card .stats-trend {
    font-size: 0.75rem;
    margin: 0.25rem 0 0 0;
    display: flex;
    align-items: center;
    
    @media (max-width: 768px) {
      justify-content: center;
    }
  }

  .admin-stats-card .stats-trend.positive {
    color: rgba(0, 230, 130, 1);
  }

  .admin-stats-card .stats-trend.negative {
    color: rgba(255, 84, 84, 1);
  }

  /* Dashboard sidebar gutter - improved for space efficiency */
  .dashboard-sidebar-gutter {
    width: 1px !important;
  }

  /* Compact footer styles - responsive adjustments */
  .dashboard-compact-footer {
    padding: 0.75rem 1rem;
    background: rgba(20, 20, 40, 0.6);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    height: auto !important;
    min-height: 0 !important;
    
    @media (max-width: 600px) {
      flex-direction: column;
      text-align: center;
      gap: 8px;
    }
  }

  /* Accessibility classes - essential for screen readers */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
  
  /* Focus styles for keyboard navigation - critical for accessibility */
  :focus {
    outline: 2px solid #00ffff;
    outline-offset: 2px;
  }
  
  /* Skip to main content link - accessibility feature */
  .skip-to-content {
    position: absolute;
    top: -40px;
    left: 0;
    background: #00ffff;
    color: #0a0a1a;
    padding: 8px 16px;
    z-index: 1000;
    transition: top 0.3s;
    
    &:focus {
      top: 0;
    }
  }
  
  /* Scrollbar styles - improved contrast for better visibility */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }
  
  ::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.3);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 255, 0.5);
  }
  
  /* Enhanced mobile menu styling */
  .mobile-menu {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(10, 10, 30, 0.95);
    backdrop-filter: blur(10px);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: translateY(-100%);
    transition: opacity 0.3s ease, transform 0.3s ease;
    
    &.open {
      opacity: 1;
      transform: translateY(0);
    }
    
    .mobile-menu-links {
      display: flex;
      flex-direction: column;
      gap: 24px;
      text-align: center;
      
      a {
        color: white;
        font-size: 1.25rem;
        font-weight: 500;
        transition: color 0.2s ease;
        
        &:hover, &:focus {
          color: #00ffff;
        }
      }
    }
    
    .close-button {
      position: absolute;
      top: 24px;
      right: 24px;
      background: transparent;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      
      &:hover, &:focus {
        color: #00ffff;
      }
    }
  }
  
  /* Enhanced table responsiveness */
  .responsive-table-container {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  /* Fix for form fields in mobile */
  @media (max-width: 768px) {
    input,
    select,
    textarea,
    .MuiInputBase-root,
    .MuiButton-root {
      font-size: 16px !important; /* Prevents zoom on iOS */
      min-height: 44px !important; /* Better touch targets */
    }
  }
  
  /* Reduced motion preference support */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

export default ImprovedGlobalStyle;