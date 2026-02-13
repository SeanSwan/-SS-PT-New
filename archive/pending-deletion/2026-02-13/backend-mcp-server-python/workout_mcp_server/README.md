# Workout MCP Server

A Python-based MCP server that exposes workout tracking functionality through the Model Context Protocol (MCP).

## Features

This server provides tools for:
- Retrieving workout recommendations
- Managing workout sessions
- Analyzing progress data
- Generating workout plans

The server is designed with a modular architecture for maintainability and follows best practices for security and error handling.

## Installation

1. Make sure you have Python 3.9+ installed
2. Clone the repository
3. Create a `.env` file based on `.env.example` in the `workout_mcp_server` directory
4. Run the server using the launcher script:

```bash
python start_workout_server.py
```

## Configuration

The server can be configured through environment variables or a `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 8000 |
| DEBUG | Debug mode (true/false) | true |
| LOG_LEVEL | Logging level (debug/info/warning/error) | info |
| BACKEND_API_URL | Backend API URL | http://localhost:5000/api |
| API_TOKEN | API token for authentication | |
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 5432 |
| DB_NAME | Database name | workout |
| DB_USER | Database user | |
| DB_PASSWORD | Database password | |

## MCP Tools

The server exposes the following MCP tools:

### GetWorkoutRecommendations

Get personalized exercise recommendations for a user based on their goals, preferences, and progress.

### GetClientProgress

Get a client's progress data, including skill levels, workout history metrics, streak information, and personal records.

### GetWorkoutStatistics

Get comprehensive workout statistics for a user, including total workout metrics, exercise breakdown, muscle group activation, workout schedule patterns, and intensity trends.

### LogWorkoutSession

Log a workout session for a user. This can be used to create a new planned workout, start a workout, complete a workout, or update exercises and sets with performance data.

### GenerateWorkoutPlan

Generate a personalized workout plan for a client based on their goals, preferences, and available equipment.

## Architecture

The server follows a modular architecture:

- **models/**: Pydantic models for data validation
- **routes/**: FastAPI routes for MCP tools
- **tools/**: MCP tool implementations
- **utils/**: Utility functions for configuration, database, and API client
- **main.py**: Main server entry point

## Database

The server currently uses an in-memory database for development and testing. This is not suitable for production use, and data will be lost when the server restarts.

In the future, a proper database implementation using SQLAlchemy will be added.

## Security Considerations

- The server uses environment variables for configuration
- Sensitive information is masked in logs
- API requests are authenticated using a token
- Error handling is implemented to prevent information leakage

## Running in Production

For production use:

1. Set `DEBUG=false` in the environment
2. Configure a proper database
3. Set up a reverse proxy (e.g., Nginx)
4. Use a process manager (e.g., Supervisor)
5. Consider using Docker for containerization

## Troubleshooting

- Check the logs for error messages
- Verify the backend API is running and accessible
- Ensure the configuration is correct in the `.env` file
- Make sure the required packages are installed

## License

This project is licensed under the MIT License - see the LICENSE file for details.
