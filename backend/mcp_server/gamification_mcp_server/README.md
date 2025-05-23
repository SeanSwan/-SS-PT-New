# Gamification MCP Server

## Overview
This MCP server implements the "Wholesome Warrior's Path" gamification system for the fitness application. It provides tools for tracking activities, awarding points, managing achievements, and providing an engaging game-like experience to motivate users.

## Features
- Activity tracking and reward calculation
- Multiple progression categories (strength, cardio, flexibility, etc.)
- Achievement system with unlockable rewards
- Streak tracking with bonuses for consistency
- Game board with spaces, movement, and rewards
- Challenge and kindness quest systems
- Extensive configuration options

## Directory Structure
```
gamification_mcp_server/
├── models/               # Data models and schemas
├── services/             # Business logic and services
├── tools/                # MCP tool implementations
├── routes/               # FastAPI routes
├── utils/                # Utility functions
├── main.py               # Server entry point
├── requirements.txt      # Dependencies
└── __init__.py           # Package initialization
```

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Setup
1. Clone the repository (if you haven't already):
   ```bash
   git clone https://github.com/yourusername/quick-pt.git
   cd quick-pt/backend/mcp_server
   ```

2. Install dependencies:
   ```bash
   pip install -r ./gamification_mcp_server/requirements.txt
   ```

3. Create a `.env` file:
   ```bash
   cp ./gamification_mcp_server/.env.example ./gamification_mcp_server/.env
   ```

4. Edit the `.env` file to configure your server:
   ```
   # Server configuration
   PORT=8001
   DEBUG=true
   LOG_LEVEL=info

   # API connection
   BACKEND_API_URL=http://localhost:5000/api
   API_TOKEN=your_api_token_here

   # Database configuration (for future use)
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=gamification
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   ```

## Running the Server

### Using the Launcher Script
The easiest way to start the server is using the launcher script:

```bash
python start_gamification_server.py
```

This will:
1. Install all required dependencies
2. Load configuration from the .env file
3. Start the server on the configured port (default: 8001)

### Manually
If you prefer to start the server manually:

```bash
# From the project root
cd backend/mcp_server
python -m uvicorn gamification_mcp_server.main:app --host 0.0.0.0 --port 8001 --reload
```

## Usage

### API Endpoints
The server exposes the following MCP tools:

- `POST /tools/LogActivity` - Track user activities and calculate rewards
- `POST /tools/GetGamificationProfile` - Retrieve a user's profile
- `POST /tools/GetAchievements` - Get available achievements
- `POST /tools/GetBoardPosition` - Get a user's position on the game board
- `POST /tools/RollDice` - Move on the game board
- `POST /tools/GetChallenges` - Get available challenges
- `POST /tools/JoinChallenge` - Participate in a challenge
- `POST /tools/GetKindnessQuests` - Get available kindness quests

### Metadata Endpoints
- `GET /` - Server information
- `GET /tools` - List available tools
- `GET /schema` - OpenAPI schema

## Development Notes

### Current Limitations
- Using in-memory storage (data is lost when server restarts)
- Simplified reward calculation logic
- Authentication is temporarily disabled for testing

### Planned Enhancements
- Database integration for persistent storage
- Complete implementation of detailed reward logic
- Enhanced integration with nutrition tracking
- Admin interface for configuring reward values
- Re-enabling authentication with proper error handling

### Configuration
All configuration is managed through environment variables or the `.env` file:
- `PORT` - Server port (default: 8001)
- `DEBUG` - Enable debug mode (default: true)
- `LOG_LEVEL` - Logging level (default: info)
- `BACKEND_API_URL` - URL of the backend API
- `API_TOKEN` - Authentication token for the backend API
- Database credentials (for future implementation)

## Security Notes
- Never commit the `.env` file or any file containing sensitive information
- Avoid hardcoding credentials or secrets in the code
- Rotate API tokens regularly
- In production, disable debug mode and set appropriate log levels

## Troubleshooting
- If you see connection errors to the backend API, check the `BACKEND_API_URL` and `API_TOKEN` settings
- If the server won't start, ensure the port is not already in use
- For 500 errors, check the server logs for detailed error messages
