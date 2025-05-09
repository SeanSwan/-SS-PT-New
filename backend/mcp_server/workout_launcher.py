#!/usr/bin/env python3
"""
Direct Workout MCP Server Launcher
This script correctly sets up the Python path and runs the server
"""

import os
import sys
import uvicorn
import importlib.util
from pathlib import Path

# Get absolute path to the workout_mcp_server directory
current_dir = Path(__file__).parent.absolute()
workout_dir = current_dir / "workout_mcp_server"

# Add the parent directory to Python path so relative imports work
sys.path.insert(0, str(current_dir))

# Add the workout_mcp_server directory to Python path
sys.path.insert(0, str(workout_dir))

# Set environment variables
os.environ["PORT"] = "8000"
os.environ["DEBUG"] = "true"
os.environ["LOG_LEVEL"] = "info"
os.environ["MONGODB_HOST"] = "localhost" 
os.environ["MONGODB_PORT"] = "27017"  # Updated to match the detected MongoDB port
os.environ["MONGODB_DB"] = "swanstudios"

# Change to the workout_mcp_server directory
os.chdir(workout_dir)

# Print startup message
print("\n" + "="*80)
print(" "*30 + "Direct Workout MCP Server Launcher")
print("="*80 + "\n")

print(f"Starting Workout MCP Server from {workout_dir}")
print(f"Python path: {sys.path}")

if __name__ == "__main__":
    try:
        # Run the server directly with the correct app module path
        uvicorn.run("main:app", 
                    host="0.0.0.0", 
                    port=8000, 
                    reload=True,
                    log_level="info")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)
