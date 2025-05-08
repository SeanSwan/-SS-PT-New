# MCP Server Integration

## Overview

This directory contains the integration with Model Context Protocol (MCP) servers for the SwanStudios fitness application. The MCP servers provide AI-powered functionality for workout recommendations, gamification, and other features.

## Architecture

The MCP integration follows a modular architecture:

```
services/mcp/
├── workoutMcpService.ts        # Workout MCP API service
├── gamificationMcpService.ts   # Gamification MCP API service
├── utils/
│   └── mcp-error-handler.ts    # Centralized error handling
└── README.md                   # Documentation
```

## MCP Servers

The application connects to two MCP servers:

1. **Workout MCP Server**: Provides fitness data, workout recommendations, and nutrition tracking
   - Default URL: http://localhost:8000
   - Environment variable: REACT_APP_WORKOUT_MCP_URL

2. **Gamification MCP Server**: Handles achievements, challenges, rewards, and gamification elements
   - Default URL: http://localhost:8001
   - Environment variable: REACT_APP_GAMIFICATION_MCP_URL

## Integration Components

The MCP integration consists of several key components:

### Service Files

- **workoutMcpService.ts**: Handles all API calls to the Workout MCP server
- **gamificationMcpService.ts**: Handles all API calls to the Gamification MCP server

### Utilities

- **mcp-error-handler.ts**: Provides centralized error handling and formatting
- **mcp-utils.ts**: Utility functions for MCP server status checking and data synchronization

### Custom Hooks

- **useMcpIntegration.ts**: General-purpose hook for MCP integration
- **useClientDashboardMcp.ts**: Specialized hook for client dashboard MCP integration

### UI Components

- **McpStatusIndicator.tsx**: Visual indicator for MCP server status
- **GamificationDisplay.tsx**: Component for displaying gamification data from MCP
- **FoodIntakeForm.tsx**: Component for logging food intake with MCP integration

## Data Flow

The data flow between components works as follows:

1. Client workout data goes to the Workout MCP server
2. Workout MCP server processes the data and sends it to the Gamification MCP
3. Gamification MCP calculates achievements, points, and other rewards
4. Client dashboard displays the updated information from both servers
5. Trainer dashboard can access all this information for their clients

## Error Handling

The MCP integration includes robust error handling:

- Centralized error formatting with the `handleMcpError` function
- Different error types based on the nature of the error
- Fallback mechanisms to use mock data when servers are offline
- User-friendly error messages and toast notifications

## Authentication

The MCP servers use token-based authentication:

- Authentication token is retrieved from localStorage or environment variables
- Token is included in request headers for all API calls
- Token key is configured in the environment configuration

## Configuration

Configuration for MCP servers is centralized in the `env-config.ts` file:

```typescript
// MCP Server URLs
export const MCP_CONFIG = {
  // Workout MCP Server
  WORKOUT_MCP_URL: process.env.REACT_APP_WORKOUT_MCP_URL || 'http://localhost:8000',
  
  // Gamification MCP Server
  GAMIFICATION_MCP_URL: process.env.REACT_APP_GAMIFICATION_MCP_URL || 'http://localhost:8001',
  
  // Authentication settings
  AUTH_TOKEN_KEY: 'auth_token',
  
  // Default timeout (in milliseconds)
  DEFAULT_TIMEOUT: 10000
};
```

## Usage Examples

### Basic Usage

```typescript
import { workoutMcpApi } from '../../services/mcp/workoutMcpService';
import { gamificationMcpApi } from '../../services/mcp/gamificationMcpService';

// Check MCP server status
const checkStatus = async () => {
  try {
    const workoutStatus = await workoutMcpApi.checkServerStatus();
    const gamificationStatus = await gamificationMcpApi.checkServerStatus();
    console.log('MCP Status:', { workout: workoutStatus, gamification: gamificationStatus });
  } catch (error) {
    console.error('Error checking MCP status:', error);
  }
};

// Get workout recommendations
const getRecommendations = async (userId: string) => {
  try {
    const response = await workoutMcpApi.getWorkoutRecommendations({
      userId,
      goal: 'strength',
      difficulty: 'intermediate',
      limit: 5
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return null;
  }
};
```

### Using Hooks

```typescript
import { useEffect } from 'react';
import useClientDashboardMcp from '../../hooks/useClientDashboardMcp';

const ClientDashboard = () => {
  const {
    loading,
    mcpStatus,
    workoutData,
    gamificationData,
    refreshData,
    logWorkoutCompletion,
    logFoodIntake
  } = useClientDashboardMcp();
  
  useEffect(() => {
    // Data is automatically loaded on mount
    console.log('MCP Status:', mcpStatus);
    console.log('Workout Data:', workoutData);
    console.log('Gamification Data:', gamificationData);
  }, [mcpStatus, workoutData, gamificationData]);
  
  const handleCompleteWorkout = async (workoutData) => {
    const success = await logWorkoutCompletion(workoutData);
    if (success) {
      console.log('Workout logged successfully!');
    }
  };
  
  return (
    <div>
      {/* Your dashboard UI */}
      {loading ? <LoadingSpinner /> : <DashboardContent data={workoutData} />}
      
      {/* MCP Status Indicator */}
      <McpStatusIndicator status={mcpStatus} />
    </div>
  );
};
```

## Best Practices

1. **Always check MCP server status** before making API calls
2. **Implement fallback mechanisms** to handle offline servers
3. **Use centralized error handling** to provide consistent user experience
4. **Refresh data after mutations** to ensure UI is up to date
5. **Use the specialized hooks** instead of direct API calls when possible

## Troubleshooting

Common issues and solutions:

1. **Connection errors**: Check that MCP servers are running and environment variables are set correctly
2. **Authentication errors**: Ensure auth token is valid and properly stored
3. **Data not updating**: Make sure to refresh data after mutations
4. **Performance issues**: Use caching mechanisms in the hooks to prevent too many requests

## Future Improvements

Planned enhancements for the MCP integration:

1. **WebSocket support** for real-time updates
2. **Offline mode** with better data persistence
3. **Enhanced sync mechanisms** between MCP servers
4. **More granular error handling** for specific API endpoints