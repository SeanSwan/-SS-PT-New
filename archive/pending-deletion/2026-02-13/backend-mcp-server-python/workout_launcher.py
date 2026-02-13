#!/usr/bin/env python3
"""
Simplified Workout MCP Server Launcher
Starts the server even if some optional dependencies are missing
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

def setup_python_path():
    """Set up Python path for proper imports."""
    script_dir = Path(__file__).parent.absolute()
    
    # Add critical directories to Python path
    paths_to_add = [
        script_dir,
        script_dir / "workout_mcp_server",
    ]
    
    for path in paths_to_add:
        if str(path) not in sys.path:
            sys.path.insert(0, str(path))
    
    # Set PYTHONPATH environment variable
    pythonpath = os.pathsep.join(str(p) for p in paths_to_add)
    if 'PYTHONPATH' in os.environ:
        os.environ['PYTHONPATH'] = f"{pythonpath}{os.pathsep}{os.environ['PYTHONPATH']}"
    else:
        os.environ['PYTHONPATH'] = pythonpath
    
    logger.info(f"Python path configured")

def check_core_dependencies():
    """Check if core dependencies are available."""
    core_modules = ['fastapi', 'uvicorn']
    missing = []
    
    for module in core_modules:
        try:
            __import__(module)
        except ImportError:
            missing.append(module)
    
    if missing:
        logger.error(f"Missing critical modules: {missing}")
        logger.error("Please install with: pip install fastapi uvicorn")
        return False
    
    logger.info("Core dependencies available")
    return True

def start_server():
    """Start the Workout MCP Server."""
    logger.info("Starting Workout MCP Server...")
    
    script_dir = Path(__file__).parent.absolute()
    server_path = script_dir / "workout_mcp_server" / "main.py"
    
    if not server_path.exists():
        logger.error(f"Server file not found at {server_path}")
        sys.exit(1)
    
    # Setup paths before importing
    setup_python_path()
    
    # Change to server directory
    os.chdir(server_path.parent)
    
    # Set environment variables
    os.environ["PORT"] = "8000"
    os.environ["DEBUG"] = "true"
    
    try:
        # Import uvicorn
        import uvicorn
        
        # Start the server
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            log_level="info",
            reload=False
        )
        
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    try:
        # Only check core dependencies, warn about optional ones
        if not check_core_dependencies():
            logger.error("Cannot start without core dependencies")
            sys.exit(1)
        
        # Start the server
        start_server()
        
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)
