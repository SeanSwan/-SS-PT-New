# Quick-PT Fitness Application

## Overview
Quick-PT is a comprehensive fitness application featuring the "Wholesome Warrior's Path" gamification system that rewards users for holistic health activities including workouts, recovery, nutrition, supplements, and community actions.

## Key Components

### Backend
- Node.js with Express
- PostgreSQL database with Sequelize ORM
- RESTful API endpoints
- JWT authentication

### Frontend
- React with Vite
- TypeScript
- Redux Toolkit for state management
- React Router for navigation

### MCP Servers
- **Workout MCP Server**: Python-based server for workout recommendations and tracking
- **Gamification MCP Server**: Python-based server implementing the "Wholesome Warrior's Path" gamification system

## Gamification System: The Wholesome Warrior's Path

The gamification system is built around a holistic approach to fitness and well-being:

### Currencies
- **Energy Tokens (ET)**: Action currency used for board exploration and challenges
- **Experience Points (XP)**: Progress metric that drives leveling across different categories

### Key Features
- **Multi-category progression**: Track progress in strength, cardio, flexibility, nutrition, recovery, and community
- **Achievement system**: Unlock achievements for consistent positive behaviors
- **Streak tracking**: Build and maintain streaks for various activities
- **Game board**: Explore the Wholesome Warrior's Path, roll dice using ET, and discover rewards and challenges
- **Kindness quests**: Complete prosocial activities to earn rewards
- **Time-limited challenges**: Participate in special challenges focusing on different aspects of well-being

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- PostgreSQL

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/quick-pt.git
cd quick-pt
```

2. Install backend dependencies:
```
cd backend
npm install
```

3. Install frontend dependencies:
```
cd ../frontend
npm install
```

4. Install MCP server dependencies:
```
cd ../backend/mcp_server
pip install -r ./gamification_mcp_server/requirements.txt
pip install -r ./workout_mcp_server/requirements.txt
```

### Running the Application

1. Start the backend server:
```
cd backend
npm run start
```

2. Start the frontend development server:
```
cd frontend
npm run dev
```

3. Start the MCP servers:
```
cd backend/mcp_server
python start_workout_server.py
python start_gamification_server.py
```

## Recent Fixes

1. Fixed 403 Forbidden errors for client-progress API calls by temporarily removing authentication requirements
2. Fixed 404 Not Found errors by correcting route paths from `/recommendations` to `/recommended`
3. Fixed client initialization to start at level 0 instead of level 1
4. Implemented comprehensive gamification system with MCP server

## Architecture

The application follows a modular architecture:

1. **Backend API**: Handles authentication, data storage, and core business logic
2. **Frontend SPA**: Provides the user interface and client-side logic
3. **Workout MCP Server**: Specializes in workout recommendations and exercise analysis
4. **Gamification MCP Server**: Manages the entire gamification system including rewards, achievements, streaks, and the game board

## Gamification MCP Server Tools

The Gamification MCP Server provides the following tools:

- **LogActivity**: Track and reward various user activities
- **GetGamificationProfile**: Retrieve a user's complete gamification data
- **GetAchievements**: View available and earned achievements
- **GetBoardPosition**: See a user's position on the game board
- **RollDice**: Move on the game board by spending Energy Tokens
- **GetChallenges**: View available challenges
- **JoinChallenge**: Participate in time-limited challenges
- **GetKindnessQuests**: Discover prosocial activities to complete
