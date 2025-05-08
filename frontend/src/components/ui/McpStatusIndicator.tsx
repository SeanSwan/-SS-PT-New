/**
 * McpStatusIndicator Component
 * 
 * Displays the status of MCP servers with visual indicators
 * and provides information about server connectivity.
 */

import React from 'react';
import { McpServerStatus } from '../../utils/mcp-utils';
import { Box, Paper, Typography, Tooltip } from '@mui/material';
import { 
  Server, 
  Trophy,
  AlertCircle,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface McpStatusIndicatorProps {
  status: McpServerStatus;
  variant?: 'compact' | 'full';
  position?: 'floating' | 'inline';
}

/**
 * Component to display MCP server status
 */
const McpStatusIndicator: React.FC<McpStatusIndicatorProps> = ({
  status,
  variant = 'compact',
  position = 'floating'
}) => {
  const hasFullFunctionality = status.workout && status.gamification;
  const hasBasicFunctionality = status.workout;
  
  // Helper to determine status color
  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? '#00c853' : '#ff0000';
  };
  
  // Helper to determine status background color
  const getStatusBgColor = (isOnline: boolean) => {
    return isOnline ? 'rgba(0, 200, 83, 0.2)' : 'rgba(255, 0, 0, 0.2)';
  };
  
  // Helper to determine status border color
  const getStatusBorderColor = (isOnline: boolean) => {
    return isOnline ? 'rgba(0, 200, 83, 0.5)' : 'rgba(255, 0, 0, 0.5)';
  };
  
  // Helper to determine overall status text
  const getOverallStatusText = () => {
    if (hasFullFunctionality) {
      return 'All MCP servers online';
    } else if (hasBasicFunctionality) {
      return 'Basic MCP functionality available';
    } else {
      return 'MCP servers offline';
    }
  };
  
  // Helper to determine overall status icon
  const getOverallStatusIcon = () => {
    if (hasFullFunctionality) {
      return <CheckCircle size={15} color="#00c853" />;
    } else if (hasBasicFunctionality) {
      return <AlertTriangle size={15} color="#ff9800" />;
    } else {
      return <AlertCircle size={15} color="#ff0000" />;
    }
  };
  
  // Render full variant
  if (variant === 'full') {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: 1,
          ...(position === 'floating' ? {
            position: 'fixed',
            bottom: '15px',
            left: '15px',
            zIndex: 1000,
          } : {})
        }}
      >
        <Paper
          elevation={2}
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: hasFullFunctionality ? 
              'rgba(0, 200, 83, 0.1)' : 
              hasBasicFunctionality ? 
              'rgba(255, 152, 0, 0.1)' : 
              'rgba(255, 0, 0, 0.1)',
            border: '1px solid',
            borderColor: hasFullFunctionality ? 
              'rgba(0, 200, 83, 0.3)' : 
              hasBasicFunctionality ? 
              'rgba(255, 152, 0, 0.3)' : 
              'rgba(255, 0, 0, 0.3)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {getOverallStatusIcon()}
            <Typography variant="subtitle2" sx={{ ml: 1 }}>
              {getOverallStatusText()}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: '5px 10px',
                borderRadius: '20px',
                bgcolor: getStatusBgColor(status.workout),
                border: '1px solid',
                borderColor: getStatusBorderColor(status.workout)
              }}
            >
              <Server size={15} color={getStatusColor(status.workout)} />
              <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 'bold' }}>
                Workout MCP
              </Typography>
            </Box>
            
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: '5px 10px',
                borderRadius: '20px',
                bgcolor: getStatusBgColor(status.gamification),
                border: '1px solid',
                borderColor: getStatusBorderColor(status.gamification)
              }}
            >
              <Trophy size={15} color={getStatusColor(status.gamification)} />
              <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 'bold' }}>
                Gamification MCP
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  }
  
  // Render compact variant
  return (
    <Box 
      sx={{ 
        display: 'flex',
        gap: '10px',
        ...(position === 'floating' ? {
          position: 'fixed',
          bottom: '15px',
          left: '15px',
          zIndex: 1000,
          opacity: 0.8,
          '&:hover': { opacity: 1 }
        } : {})
      }}
    >
      <Tooltip title={`Workout MCP Server: ${status.workout ? 'Online' : 'Offline'}`}>
        <Paper 
          elevation={2} 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '5px 10px',
            borderRadius: '20px',
            bgcolor: getStatusBgColor(status.workout),
            border: '1px solid',
            borderColor: getStatusBorderColor(status.workout)
          }}
        >
          <Server size={15} color={getStatusColor(status.workout)} />
          <Typography variant="caption" sx={{ ml: 0.5, color: 'white', fontWeight: 'bold' }}>
            Workout
          </Typography>
        </Paper>
      </Tooltip>
      
      <Tooltip title={`Gamification MCP Server: ${status.gamification ? 'Online' : 'Offline'}`}>
        <Paper 
          elevation={2} 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '5px 10px',
            borderRadius: '20px',
            bgcolor: getStatusBgColor(status.gamification),
            border: '1px solid',
            borderColor: getStatusBorderColor(status.gamification)
          }}
        >
          <Trophy size={15} color={getStatusColor(status.gamification)} />
          <Typography variant="caption" sx={{ ml: 0.5, color: 'white', fontWeight: 'bold' }}>
            Gamification
          </Typography>
        </Paper>
      </Tooltip>
    </Box>
  );
};

export default McpStatusIndicator;