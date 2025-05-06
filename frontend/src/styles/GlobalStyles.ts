/**
 * Global Styles
 * ============
 * Global style definitions and utility classes
 */

import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  /* Reset and base styles */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body, html {
    font-family: 'Inter', 'Segoe UI', 'Roboto', sans-serif;
    background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
    color: white;
    min-height: 100vh;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }
  
  #root {
    background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
    min-height: 100vh;
    width: 100%;
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

  /* Input field styling */
  .MuiInputBase-root,
  .MuiOutlinedInput-root,
  .MuiTextField-root,
  .MuiSelect-root,
  .MuiAutocomplete-root {
    background-color: rgba(40, 40, 80, 0.4) !important;
    color: white !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
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

  /* Button styling */
  .MuiButton-root,
  .MuiIconButton-root {
    background-color: rgba(40, 40, 100, 0.4) !important;
    color: white !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
  }

  .MuiButton-root:hover,
  .MuiIconButton-root:hover {
    background-color: rgba(60, 60, 140, 0.6) !important;
    border-color: rgba(255, 255, 255, 0.4) !important;
  }

  /* Tab styling */
  .MuiTab-root {
    color: rgba(255, 255, 255, 0.7) !important;
  }

  .MuiTab-root.Mui-selected {
    color: #00ffff !important;
  }

  /* Login form specific adjustments */
  .login-form .MuiPaper-root,
  .signup-form .MuiPaper-root {
    background-color: rgba(30, 30, 60, 0.3) !important;
    backdrop-filter: blur(10px) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
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
  }

  /* Table header styling */
  .MuiTableHead-root th {
    background-color: rgba(20, 20, 50, 0.7) !important;
    font-weight: bold !important;
  }

  /* Admin Dashboard Stats Card Styles */
  .admin-stats-card {
    display: flex;
    align-items: center;
    background: rgba(30, 30, 60, 0.5);
    border-radius: 12px;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
    height: 100%;
  }

  .admin-stats-card:hover {
    transform: translateY(-5px);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }

  .admin-stats-card .stats-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 1rem;
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
    font-size: 1.5rem;
    font-weight: 500;
    margin: 0;
    color: white;
  }

  .admin-stats-card .stats-trend {
    font-size: 0.75rem;
    margin: 0.25rem 0 0 0;
    display: flex;
    align-items: center;
  }

  .admin-stats-card .stats-trend.positive {
    color: rgba(0, 230, 130, 1);
  }

  .admin-stats-card .stats-trend.negative {
    color: rgba(255, 84, 84, 1);
  }

  /* Dashboard sidebar gutter */
  .dashboard-sidebar-gutter {
    width: 1px !important; /* Reduced from 4px to 1px (75% thinner) */
  }

  /* Compact footer styles */
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
    height: auto !important; /* Ensure compact height */
    min-height: 0 !important; /* Override any minimum height */
  }

  /* Accessibility classes */
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
  
  /* Focus styles for keyboard navigation */
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
  }
  
  .skip-to-content:focus {
    top: 0;
  }
  
  /* Scrollbar styles */
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
`;

export default GlobalStyles;