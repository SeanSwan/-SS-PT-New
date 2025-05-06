# SwanStudios Workout MCP Server

This MCP (Model Context Protocol) server provides AI-powered workout functionality for the SwanStudios fitness application. It acts as a bridge between large language models (LLMs) and the SwanStudios backend services.

## Features

- **AI-Powered Workout Recommendations**: Get personalized exercise recommendations based on goals, equipment availability, and fitness level
- **Progress Tracking**: Access comprehensive progress data and statistics 
- **Workout Session Management**: Create and update workout sessions with exercises and performance data
- **Workout Plan Generation**: Generate comprehensive workout plans tailored to client needs

## What is MCP?

The Model Context Protocol (MCP) is a standard for enabling AI language models to access external tools, data sources, and services. This server implements the MCP standard to allow language models to interact with the SwanStudios workout system.

## Setup and Installation

### Prerequisites

- Python 3.9 or higher
- Access to the SwanStudios backend API

### Installation

1. Clone the repository
2. Install requirements:
   ```
   pip install -r requirements.txt
   ```
3. Set environment variables:
   ```
   export BACKEND_API_URL=http://localhost:5000/api  # URL to your SwanStudios backend
   export API_TOKEN=your_api_token                  # Optional: API token for backend auth
   export PORT=8000                                 # Port for MCP server (default: 8000)
   ```

### Running the Server

```
python workout_mcp_server.py
```

The server will run on http://localhost:8000 by default.

## Available Tools

The MCP server exposes the following tools:

### GetWorkoutRecommendations

Get personalized exercise recommendations for a user based on their goals, preferences, and progress.

**Input:**
- `userId`: User ID
- `goal`: Training goal (e.g., "strength", "cardio", "hypertrophy")
- `difficulty`: Exercise difficulty level
- `equipment`: Available equipment IDs
- `muscleGroups`: Target muscle group IDs
- `excludeExercises`: Exercise IDs to exclude
- `limit`: Maximum number of recommendations
- `rehabFocus`: Focus on rehabilitation exercises
- `optPhase`: NASM OPT model phase

### GetClientProgress

Get comprehensive progress data for a client.

**Input:**
- `userId`: User ID

### GetWorkoutStatistics

Get detailed workout statistics and metrics for a user.

**Input:**
- `userId`: User ID
- `startDate`: Optional start date filter
- `endDate`: Optional end date filter
- `includeExerciseBreakdown`: Include exercise frequency breakdown
- `includeMuscleGroupBreakdown`: Include muscle group activation breakdown
- `includeWeekdayBreakdown`: Include weekday workout pattern breakdown
- `includeIntensityTrends`: Include intensity trends over time

### LogWorkoutSession

Create or update a workout session with exercises and sets.

**Input:**
- `session`: Complete workout session data

### GenerateWorkoutPlan

Generate a personalized workout plan for a client.

**Input:**
- `trainerId`: Trainer user ID
- `clientId`: Client user ID
- `name`: Plan name
- `description`: Plan description
- `goal`: Training goal
- `startDate`: Start date
- `endDate`: End date
- `daysPerWeek`: Workout days per week
- `focusAreas`: Target muscle groups/areas
- `difficulty`: Overall difficulty level
- `optPhase`: NASM OPT model phase
- `equipment`: Available equipment IDs

## API Documentation

The full API documentation is available at http://localhost:8000/docs when the server is running.
