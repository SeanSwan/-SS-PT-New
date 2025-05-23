import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Card, 
  CardContent,
  CardActions,
  Button,
  IconButton,
  Tab,
  Tabs,
  Divider
} from '@mui/material';
import { 
  BugReport as BugReportIcon,
  Login as LoginIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Sync as SyncIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

// Import debug components
import CrossDashboardDebugger from './CrossDashboardDebugger';
import DevLogin from '../DevTools/DevLogin';
import ApiDebugger from './ApiDebugger';

/**
 * DevTools Component
 * 
 * A master component that provides access to various developer and debugging tools.
 */
const DevTools: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<number>(0);

  const handleToggle = () => {
    setOpen(!open);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <>
      {/* Floating button to access DevTools */}
      {!open && (
        <IconButton
          onClick={handleToggle}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            backgroundColor: '#7851A9',
            color: 'white',
            zIndex: 9999,
            '&:hover': {
              backgroundColor: '#5F3E8E',
            },
          }}
        >
          <BugReportIcon />
        </IconButton>
      )}

      {/* DevTools Panel */}
      {open && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#141427',
            color: 'white',
            zIndex: 9999,
            overflow: 'auto',
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              p: 2,
              backgroundColor: '#1a1a2e',
              borderBottom: '1px solid #3f3f5f'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BugReportIcon sx={{ fontSize: 28, mr: 1, color: '#00ffff' }} />
              <Typography variant="h5" color="#00ffff">
                SwanStudios Developer Tools
              </Typography>
            </Box>
            <IconButton onClick={handleToggle} color="inherit">
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ p: 2 }}>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ 
                mb: 3,
                '& .MuiTab-root': { color: '#f5f5f5' },
                '& .Mui-selected': { color: '#00ffff' }
              }}
            >
              <Tab icon={<DashboardIcon />} label="Dashboard Debugger" />
              <Tab icon={<LoginIcon />} label="Dev Login" />
              <Tab icon={<SyncIcon />} label="API Tester" />
              <Tab icon={<SettingsIcon />} label="Settings" />
            </Tabs>

            {/* Dashboard Debugger Tab */}
            {currentTab === 0 && (
              <CrossDashboardDebugger />
            )}

            {/* Dev Login Tab */}
            {currentTab === 1 && (
              <DevLogin />
            )}

            {/* API Tester Tab */}
            {currentTab === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
                  API Connection Debugger
                </Typography>
                <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
                  Use this tool to diagnose backend connection issues and enable mock data mode when needed.
                </Typography>
                <ApiDebugger />
              </Box>
            )}

            {/* Settings Tab */}
            {currentTab === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Dev Settings
                </Typography>
                <Typography variant="body1">
                  Configure development settings, mock data, and debug options.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </>
  );
};

export default DevTools;
