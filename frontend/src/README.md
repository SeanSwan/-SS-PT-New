# SwanStudios Fitness Platform

## MCP Server Integration

This document provides an overview of the Model Context Protocol (MCP) server integration implemented in the SwanStudios fitness platform.

## Architecture Overview

The SwanStudios fitness platform leverages two MCP servers for AI-powered functionality:

1. **Workout MCP Server**: Provides workout recommendations, training data processing, and nutrition tracking
2. **Gamification MCP Server**: Handles achievements, challenges, rewards, and gamification elements

The integration follows a modular architecture with centralized configuration, error handling, and utility functions.

## Key Components

### Service Layer

- **workoutMcpService.ts**: API service for the Workout MCP server
- **gamificationMcpService.ts**: API service for the Gamification MCP server

### Utility Functions

- **mcp-utils.ts**: Utility functions for MCP server status checking and synchronization
- **mcp-error-handler.ts**: Centralized error handling for MCP server interactions
- **mcp-auth.ts**: Authentication utilities for MCP server requests

### Custom Hooks

- **useMcpIntegration.ts**: General-purpose hook for MCP integration
- **useClientDashboardMcp.ts**: Specialized hook for client dashboard integration

### UI Components

- **McpStatusIndicator.tsx**: Visual indicator for MCP server status
- **McpIntegrationWrapper.tsx**: Wrapper component for MCP-integrated components
- **McpMonitor.tsx**: Component for monitoring MCP server health
- **GamificationDisplay.tsx**: Component for displaying gamification data
- **FoodIntakeForm.tsx**: Component for logging food intake with MCP integration

## Data Flow

The data flow between components works as follows:

1. **User Actions**: Users perform actions like completing workouts or logging food intake
2. **API Services**: These actions are sent to the appropriate MCP server via API services
3. **Data Processing**: MCP servers process the data and generate results
4. **UI Update**: The UI is updated with the latest data from MCP servers

## Error Handling and Fallbacks

The integration includes robust error handling and fallback mechanisms:

- Centralized error handling in `mcp-error-handler.ts`
- Mock data generation for development and offline scenarios
- Error boundaries to prevent component crashes
- User-friendly error messages and retry options

## Authentication and Security

The MCP server integration includes security features:

- Token-based authentication for API requests
- Configurable authentication settings in `env-config.ts`
- Secure token storage and management

## Usage Examples

### Using the Custom Hook

```typescript
// Import the hook
import useClientDashboardMcp from '../../hooks/useClientDashboardMcp';

// Component using MCP integration
const ClientDashboard = () => {
  // Use the hook to access MCP functionality
  const {
    loading,
    mcpStatus,
    workoutData,
    gamificationData,
    refreshData,
    logWorkoutCompletion,
    logFoodIntake
  } = useClientDashboardMcp();
  
  // Component logic...
};
```

### Using the McpIntegrationWrapper

```tsx
// Wrap components that depend on MCP
<McpIntegrationWrapper
  loading={loading}
  mcpStatus={mcpStatus}
  error={error}
  onRetry={() => refreshData(true)}
>
  <YourComponent data={workoutData} />
</McpIntegrationWrapper>
```

### Using the GamificationDisplay

```tsx
<GamificationDisplay
  variant="compact"
  onDataLoaded={(data) => {
    console.log('Gamification data loaded:', data);
  }}
/>
```

## Accessibility Features

All MCP-integrated components follow WCAG AA accessibility standards:

- Proper color contrast for status indicators
- Keyboard navigation support
- Screen reader compatibility
- Focus management

## Mobile Responsiveness

The MCP integration is fully responsive:

- Compact variants for mobile displays
- Responsive layout adjustments
- Touch-friendly interaction
- Optimized performance for mobile devices

## Future Improvements

Planned enhancements for the MCP integration:

1. **WebSocket Support**: Enable real-time updates from MCP servers
2. **Offline Mode**: Enhance offline capabilities with local storage persistence
3. **Expanded Gamification**: Add more game elements like multiplayer challenges
4. **Enhanced Analytics**: Provide deeper insights into workout and nutrition data
5. **Advanced Security**: Implement more sophisticated authentication and authorization

## Setting Up MCP Servers

To set up the MCP servers locally:

1. Clone the MCP server repositories
2. Install dependencies
3. Configure the environment variables
4. Start the servers
5. Update the MCP URLs in the SwanStudios app

## Troubleshooting

Common issues and solutions:

1. **Connection Errors**: Check if MCP servers are running and the URLs are correct
2. **Authentication Errors**: Verify the authentication token is set correctly
3. **Data Not Displaying**: Refresh the data using the refresh button or reload the page
4. **Performance Issues**: Check the server health monitor for potential bottlenecks

## Contributing

When contributing to the MCP integration:

1. Follow the established architecture pattern
2. Use the provided utility functions and hooks
3. Implement proper error handling
4. Maintain accessibility standards
5. Write tests for new functionality