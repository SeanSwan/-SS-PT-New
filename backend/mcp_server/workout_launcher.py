#!/usr/bin/env python3
"""
Simplified Workout MCP Server Launcher for npm start
Ensures the server starts correctly in the npm environment
"""

import os
import sys
import logging
from pathlib import Path

# Set up logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("workout_mcp_launcher")

# Get the directory containing this script
script_dir = Path(__file__).parent.absolute()

# Try the modular server first, then fall back to the standalone server
server_options = [
    {
        "name": "Modular Server", 
        "path": script_dir / "workout_mcp_server" / "main.py",
        "working_dir": script_dir / "workout_mcp_server"
    },
    {
        "name": "Standalone Server",
        "path": script_dir / "workout_mcp_server.py", 
        "working_dir": script_dir
    }
]

def start_server():
    """Start the appropriate MCP server."""
    logger.info("Starting Workout MCP Server...")
    
    for option in server_options:
        if option["path"].exists():
            logger.info(f"Found {option['name']} at {option['path']}")
            try:
                # Change to the appropriate working directory
                os.chdir(option["working_dir"])
                
                # Set environment variables
                os.environ["PORT"] = "8000"
                os.environ["DEBUG"] = "true"
                os.environ["MCP_WORKOUT_PORT"] = "8000"
                
                # Add Python path
                sys.path.insert(0, str(option["working_dir"]))
                
                # Import and run the server
                if option["name"] == "Modular Server":
                    logger.info("Starting modular Workout MCP Server...")
                    import uvicorn
                    uvicorn.run("main:app", host="0.0.0.0", port=8000, log_level="info")
                else:
                    logger.info("Starting standalone Workout MCP Server...")
                    import uvicorn
                    # Import the app from workout_mcp_server.py
                    spec = importlib.util.spec_from_file_location("workout_server", option["path"])
                    workout_server = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(workout_server)
                    # Run the server
                    uvicorn.run(workout_server.app, host="0.0.0.0", port=8000, log_level="info")
                
                return  # Exit if server started successfully
                
            except Exception as e:
                logger.error(f"Failed to start {option['name']}: {e}")
                continue
    
    # If we get here, no server could be started
    logger.error("Could not start any Workout MCP Server")
    logger.info("Please ensure dependencies are installed: pip install fastapi uvicorn pydantic")
    sys.exit(1)

if __name__ == "__main__":
    import importlib.util
    
    # Check dependencies
    required_modules = ['fastapi', 'uvicorn', 'pydantic']
    missing_modules = []
    
    for module in required_modules:
        try:
            importlib.import_module(module)
        except ImportError:
            missing_modules.append(module)
    
    if missing_modules:
        logger.error(f"Missing required modules: {missing_modules}")
        logger.info("Please install them with: pip install " + " ".join(missing_modules))
        sys.exit(1)
    
    start_server()
