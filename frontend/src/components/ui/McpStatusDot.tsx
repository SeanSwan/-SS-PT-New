/**
 * MCP Status Dot Component
 * 
 * A simple indicator that shows the status of both MCP servers
 * with color-coded dots in the sidebar
 */

import React, { useEffect, useState } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { Activity } from 'lucide-react';

// Import MCP server utilities 
import { useMcpIntegration } from '../../hooks/useMcpIntegration';

interface McpStatusDotProps {
  miniMode?: boolean;
}

/**
 * MCP Status Dot Component
 * Shows the status of MCP servers in the sidebar with green/red dots
 */
const McpStatusDot: React.FC<McpStatusDotProps> = ({ miniMode = false }) => {
  const { mcpStatus, checkAllServers } = useMcpIntegration();
  const [isMounted, setIsMounted] = useState(false);

  // Check server status on mount and periodically
  useEffect(() => {
    setIsMounted(true);
    
    // Initial check
    checkAllServers();
    
    // Set up polling interval (every 30 seconds)
    const interval = setInterval(() => {
      if (isMounted) {
        checkAllServers();
      }
    }, 30000);
    
    return () => {
      setIsMounted(false);
      clearInterval(interval);
    };
  }, [checkAllServers]);

  // Determine overall status - both servers need to be running
  const allServersRunning = mcpStatus.workout && mcpStatus.gamification;

  return (
    <Box 
      sx={{ 
        display: 'flex',
        alignItems: 'center',
        mt: 1,
        mb: miniMode ? 1 : 0,
        justifyContent: miniMode ? 'center' : 'flex-start'
      }}
    >
      <Tooltip 
        title={
          <Box>
            <Typography variant="subtitle2">MCP Server Status</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Box 
                sx={{ 
                  width: 10, 
                  height: 10, 
                  borderRadius: '50%', 
                  bgcolor: mcpStatus.workout ? 'success.main' : 'error.main',
                  mr: 1
                }} 
              />
              <Typography variant="body2">
                Workout Server: {mcpStatus.workout ? 'Online' : 'Offline'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <Box 
                sx={{ 
                  width: 10, 
                  height: 10, 
                  borderRadius: '50%', 
                  bgcolor: mcpStatus.gamification ? 'success.main' : 'error.main',
                  mr: 1
                }} 
              />
              <Typography variant="body2">
                Gamification Server: {mcpStatus.gamification ? 'Online' : 'Offline'}
              </Typography>
            </Box>
          </Box>
        }
        arrow
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Activity size={16} style={{ marginRight: miniMode ? 0 : 8 }} />
          {!miniMode && <Typography variant="body2">MCP Status</Typography>}
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              bgcolor: allServersRunning ? 'success.main' : 'error.main',
              ml: 1,
              border: '2px solid',
              borderColor: allServersRunning ? 'success.light' : 'error.light'
            }} 
          />
        </Box>
      </Tooltip>
    </Box>
  );
};

export default McpStatusDot;
