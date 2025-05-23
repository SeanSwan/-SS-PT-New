# MCP Redux Integration

This module provides MCP (Model Context Protocol) integration for the Redux state management system in our fitness application.

## Overview

The MCP Redux integration allows AI agents to:

1. Access workout progress and statistics data from the Redux store
2. Dispatch Redux actions to update the application state
3. Create automated workflows and insights based on workout data

## Components

### Resource: WorkoutProgress

This resource provides access to the current workout state in the Redux store, including:

- Client progress data (strength levels, streak, exercise totals)
- Workout statistics (workout breakdown, intensity trends)
- Selected client and time range

### Tool: ReduxAction

This tool allows dispatching Redux actions to update the workout state:

- SET_SELECTED_CLIENT: Change the selected client
- SET_TIME_RANGE: Change the time range filter
- CLEAR_PROGRESS_DATA: Clear progress data in the store
- ENABLE_MOCK_MODE: Enable/disable mock data for development
- FETCH_CLIENT_PROGRESS: Fetch progress data for a client
- FETCH_WORKOUT_STATISTICS: Fetch workout statistics for a client

## Example Usage

### Python Example (Using MCP Client)

```python
import mcp

# Connect to the MCP server
client = mcp.connect("http://localhost:3000/mcp")

# Access workout progress data
workout_data = client.resources.WorkoutProgress.get()

# Analyze strength data
strength_level = workout_data["clientProgress"]["data"]["strengthLevel"]
print(f"Current strength level: {strength_level}")

# Dispatch a Redux action to change the time range
result = client.tools.ReduxAction.invoke({
    "actionType": "SET_TIME_RANGE",
    "payload": {
        "timeRange": "90days"
    }
})

# Check if the action was successful
if result["success"]:
    print("Time range updated successfully")
else:
    print(f"Error updating time range: {result['message']}")
```

### JavaScript Example (Using MCP Client)

```javascript
import { MCPClient } from 'mcp-client';

async function analyzeWorkoutData() {
  // Connect to the MCP server
  const client = new MCPClient("http://localhost:3000/mcp");
  
  // Access workout progress data
  const workoutData = await client.resources.WorkoutProgress.get();
  
  // Analyze streak data
  const currentStreak = workoutData.clientProgress.data.currentStreak;
  console.log(`Current workout streak: ${currentStreak} days`);
  
  // Dispatch a Redux action to fetch new progress data
  const result = await client.tools.ReduxAction.invoke({
    actionType: "FETCH_CLIENT_PROGRESS",
    payload: {
      userId: "user-123"
    }
  });
  
  // Check if the action was successful
  if (result.success) {
    console.log("Progress data updated successfully");
  } else {
    console.error(`Error updating progress data: ${result.message}`);
  }
}
```

## Integration with MCP Server

To integrate this module with your MCP server:

1. Import the Redux MCP integration:
```javascript
import { registerReduxMCP } from './mcp/ReduxIntegration';
```

2. Register the integration with your MCP server:
```javascript
import { createMCPServer } from 'mcp-server';
import { store } from './store';

const mcpServer = createMCPServer();
registerReduxMCP(mcpServer, store);

// Start the MCP server
mcpServer.listen(3000);
```

## Future Enhancements

1. Add support for more Redux slices (auth, exercise)
2. Implement real-time updates via WebSockets
3. Add analytics tools for workout trend analysis
4. Create automated workout suggestion tools

## Security Considerations

- Ensure proper authentication and authorization for MCP access
- Validate all input parameters before dispatching actions
- Consider rate limiting to prevent abuse
- Log all actions for audit purposes
