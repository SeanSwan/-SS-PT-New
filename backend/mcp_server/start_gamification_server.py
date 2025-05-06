"""
Launcher script for the Gamification MCP Server.

This script makes it easy to start the Gamification MCP Server.
It runs on port 8001 by default.

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
    
    # Start the server using uvicorn
    try:
        # Use sys.executable to get the correct Python interpreter
        subprocess.run(
            [sys.executable, "-m", "uvicorn", "gamification_mcp_server.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"],
            cwd=script_dir,
            check=True
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
