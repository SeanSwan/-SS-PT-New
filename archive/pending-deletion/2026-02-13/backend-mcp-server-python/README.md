# SwanStudios MCP Server Collection

This directory contains the MCP (Model Context Protocol) servers that power the SwanStudios fitness application. Each MCP server provides specialized functionality that enhances the platform with AI capabilities, real-time processing, and intelligent features.

## Available MCP Servers

### 1. Workout MCP Server

Provides AI-powered workout functionality for the SwanStudios fitness application.

**Features:**
- **AI-Powered Workout Recommendations**: Get personalized exercise recommendations based on goals, equipment availability, and fitness level
- **Progress Tracking**: Access comprehensive progress data and statistics 
- **Workout Session Management**: Create and update workout sessions with exercises and performance data
- **Workout Plan Generation**: Generate comprehensive workout plans tailored to client needs

### 2. Financial Events MCP Server (Enhanced)

Handles purchase events, updates analytics, and provides real-time insights into financial transactions.

**Features:**
- **Real-time Purchase Processing**: Process Stripe webhook events and update financial analytics
- **Gamification Integration**: Award points and badges for purchases via the Gamification MCP
- **Client Insights Generation**: Provide AI-powered insights based on purchase behavior
- **Trainer Matching**: Recommend suitable trainers based on client profile and preferences
- **Automated Session Scheduling**: Suggest optimal session slots for newly purchased training packages
- **Revenue Analytics & Forecasting**: Generate revenue forecasts and detailed analytics

### 3. Gamification MCP Server

Manages the gamification system for engagement and motivation.

**Features:**
- **Points and Rewards**: Award points for various user activities
- **Achievement Tracking**: Track user progress towards achievements and badges
- **Leaderboards**: Generate and maintain leaderboards for competitive features
- **Streak Management**: Track user activity streaks and consistency

### 4. YOLO MCP Server

Provides AI-powered computer vision for exercise form analysis.

**Features:**
- **Pose Detection**: Analyze exercise form using YOLOv8 pose detection
- **Rep Counting**: Automatically count repetitions in exercise videos
- **Form Correction**: Identify form issues and provide correction guidance
- **Range of Motion Analysis**: Analyze and track range of motion improvements

## What is MCP?

The Model Context Protocol (MCP) is a standard for enabling AI language models to access external tools, data sources, and services. These servers implement the MCP standard to allow language models to interact with various SwanStudios systems and provide specialized AI capabilities. The MCP servers work together as a cohesive ecosystem, communicating with each other and with the main backend to deliver a seamless, intelligent fitness platform.

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

Each MCP server has its own API documentation:

- **Workout MCP**: http://localhost:8000/docs when the server is running
- **Financial Events MCP**: http://localhost:8010/docs when the server is running
- **Gamification MCP**: http://localhost:8011/docs when the server is running
- **YOLO MCP**: http://localhost:8020/docs when the server is running

Additionally, detailed documentation for the Financial Events MCP can be found in the `financial_events_mcp/API_DOCS.md` file.

## Recent Enhancements

### Financial Events MCP Enhancements (May 2025)

The Financial Events MCP has been enhanced with several new features as part of the Master Prompt v28 implementation:

1. **Gamification Integration**: The MCP now integrates with the Gamification system to award points and badges for purchases.

2. **Client Profile Enrichment**: AI-powered insights about clients are generated based on purchase behavior to help trainers provide more personalized service.

3. **Trainer Matching**: The system now recommends suitable trainers for clients based on purchase behavior and preferences.

4. **Automated Session Scheduling**: Intelligent scheduling recommendations are provided for newly purchased training sessions.

5. **Enhanced Analytics**: The real-time analytics capabilities now include detailed forecasting, demographics, and package performance metrics.

For more details, see the implementation summary in `financial_events_mcp/IMPLEMENTATION_SUMMARY.md`.
