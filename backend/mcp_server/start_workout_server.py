#!/usr/bin/env python3
"""
Workout MCP Server Launcher

This script starts the Workout MCP Server with proper environment setup.
It automatically installs required dependencies and configures the environment.

Usage:
    python start_workout_server.py [--port PORT] [--debug]

Options:
    --port PORT    Server port (default: 8000)
    --debug        Run in debug mode
"""

import os
import sys
import argparse
import subprocess
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("workout_server_launcher")

def check_python_version():
    """Check if Python version is compatible."""
    if sys.version_info < (3, 9):
        logger.error("Python 3.9 or higher is required.")
        sys.exit(1)

def install_requirements():
    """Install required packages."""
    requirements_path = Path(__file__).parent / "requirements.txt"
    if not requirements_path.exists():
        logger.error(f"Requirements file not found at {requirements_path}")
        sys.exit(1)
    
    logger.info("Installing required packages...")
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_path)
        ])
        logger.info("Required packages installed successfully.")
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to install requirements: {e}")
        sys.exit(1)

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Start the Workout MCP Server")
    parser.add_argument("--port", type=int, default=8000, help="Server port (default: 8000)")
    parser.add_argument("--debug", action="store_true", help="Run in debug mode")
    return parser.parse_args()

def prepare_environment(args):
    """Prepare the environment variables."""
    os.environ["PORT"] = str(args.port)
    os.environ["DEBUG"] = "true" if args.debug else "false"
    log_level = "debug" if args.debug else "info"
    os.environ["LOG_LEVEL"] = log_level
    
    # Check for .env file
    env_path = Path(__file__).parent / "workout_mcp_server" / ".env"
    env_example_path = Path(__file__).parent / "workout_mcp_server" / ".env.example"
    
    if not env_path.exists() and env_example_path.exists():
        logger.warning(
            f".env file not found at {env_path}. "
            f"You should create one based on .env.example for proper configuration."
        )

def start_server():
    """Start the Workout MCP Server."""
    server_path = Path(__file__).parent / "workout_mcp_server" / "main.py"
    if not server_path.exists():
        logger.error(f"Server main file not found at {server_path}")
        sys.exit(1)
    
    logger.info("Starting Workout MCP Server...")
    try:
        # Use the directory of the server file as the working directory
        os.chdir(server_path.parent)
        
        # Execute the server module
        subprocess.check_call([sys.executable, str(server_path)])
    except subprocess.CalledProcessError as e:
        logger.error(f"Server failed to start: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Server stopped by user.")

def main():
    """Main entry point."""
    print("\n" + "="*80)
    print(" "*30 + "Workout MCP Server Launcher")
    print("="*80 + "\n")
    
    # Check Python version
    check_python_version()
    
    # Parse arguments
    args = parse_arguments()
    
    # Install requirements
    install_requirements()
    
    # Prepare environment
    prepare_environment(args)
    
    # Start server
    start_server()

if __name__ == "__main__":
    main()
