// src/layouts/MainLayout/Header.tsx
import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

// Import existing header component
import HeaderContent from '../../components/Header/header';

interface HeaderProps {
  drawerOpen: boolean;
}

/**
 * Header component for the main layout
 * Wraps the existing header content component with proper layout structure
 */
const Header: React.FC<HeaderProps> = ({ drawerOpen }) => {
  const theme = useTheme();
  
  // For personal training app - track if there's an active session
  const [hasActiveSession] = useState(false);
  const [activeClientId] = useState<string | null>(null);
  
  return (
    <AppBar 
      enableColorOnDark 
      position="fixed" 
      color="inherit" 
      elevation={0} 
      sx={{ 
        bgcolor: hasActiveSession ? (theme) => theme.palette.mode === 'dark' 
          ? 'rgba(76, 175, 80, 0.15)' // Green tint in dark mode for active session
          : 'rgba(76, 175, 80, 0.07)' // Green tint in light mode for active session
        : 'background.default',
        zIndex: theme.zIndex.drawer + 1, // Ensure header is above sidebar
        width: '100%'
      }}
    >
      <Toolbar sx={{ p: 2 }}>
        <HeaderContent />
        
        {/* Optional: Display active session indicator in header */}
        {hasActiveSession && activeClientId && (
          <Box sx={{ 
            ml: 2, 
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            py: 0.5,
            px: 1.5,
            borderRadius: 1,
            bgcolor: 'success.light',
            color: 'success.contrastText'
          }}>
            <Box component="span" sx={{ fontWeight: 'medium', mr: 1 }}>
              Active Session:
            </Box>
            Client #{activeClientId}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
