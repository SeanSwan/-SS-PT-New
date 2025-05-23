"""
Launcher script for the Gamification MCP Server.

This script makes it easy to start the Gamification MCP Server.
It runs on port 8002 by default.

Usage:
    python start_gamification_server.py
"""

import os
import sys
import subprocess

def start_gamification_server():
    """Start the Gamification MCP Server."""
    print("Starting Gamification MCP Server...")
    
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Set the working directory to the gamification_mcp_server package
    server_dir = os.path.join(script_dir, "gamification_mcp_server")
    
    # Check if requirements are installed
    try:
        # Use sys.executable to get the correct Python interpreter
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", os.path.join(server_dir, "requirements.txt")],
            check=True
        )
        print("Requirements installed or already up to date.")
    except subprocess.CalledProcessError as e:
        print(f"Error installing requirements: {e}")
        print("Please make sure you have pip installed and try again.")
        return
    
    # Add the server directory to Python path
    sys.path.insert(0, server_dir)
    
    # Also add the parent directory for better module resolution
    sys.path.insert(0, script_dir)
    
    # Change to server directory
    os.chdir(server_dir)
    
    # Set environment variable to help with imports
    os.environ['PYTHONPATH'] = f"{server_dir}:{script_dir}"
    
    # Start the server using uvicorn
    try:
        # Use sys.executable to get the correct Python interpreter
        # Run from within the package directory
        subprocess.run(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002", "--reload"],
            cwd=server_dir,
            check=True,
            env=dict(os.environ, PYTHONPATH=f"{server_dir}:{script_dir}")
        )
    except subprocess.CalledProcessError as e:
        print(f"Error starting the server: {e}")
        print("Please make sure you have uvicorn installed and try again.")
        return
    except KeyboardInterrupt:
        print("\nServer shutdown requested. Stopping...")
    
    print("Gamification MCP Server stopped.")

if __name__ == "__main__":
    start_gamification_server()
