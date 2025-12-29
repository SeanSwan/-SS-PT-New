#!/usr/bin/env python3
"""
Unified MCP Server Launcher for SwanStudios
===========================================

This script discovers and launches all available Python-based MCP servers.

Usage:
    python launch.py --server <server_name> [--port <port>]
    python launch.py --all

Examples:
    python launch.py --server workout --port 8000
    python launch.py --server gamification
"""

import os
import sys
import subprocess
import argparse
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("mcp_launcher")

ROOT_DIR = Path(__file__).parent.absolute()

SERVER_CONFIG = {
    "workout": {
        "path": "workout_mcp_server/main.py",
        "default_port": 8000,
    },
    "gamification": {
        "path": "gamification_mcp_server/main.py",
        "default_port": 8002,
    },
    "enhanced_gamification": {
        "path": "enhanced_gamification_mcp/enhanced_gamification_mcp_server.py",
        "default_port": 8003,
    },
    "yolo": {
        "path": "yolo_mcp_server/yolo_mcp_server.py",
        "default_port": 8005,
    },
    # Add new servers here
    # "nutrition": { ... }
}

def start_server(name, port):
    """Starts a single MCP server."""
    if name not in SERVER_CONFIG:
        logger.error(f"Server '{name}' not found in configuration.")
        return

    config = SERVER_CONFIG[name]
    server_path = ROOT_DIR / config["path"]
    server_port = port or config["default_port"]

    if not server_path.exists():
        logger.warning(f"Server script for '{name}' not found at {server_path}. Skipping.")
        return

    logger.info(f"Starting '{name}' server on port {server_port}...")
    
    env = os.environ.copy()
    env["PORT"] = str(server_port)

    # Use 'start' on Windows to open a new command window
    cmd = [
        "start",
        f"MCP-{name.upper()}",
        "/D", str(server_path.parent),
        sys.executable,
        "-m", "uvicorn",
        f"{server_path.stem}:app",
        "--host", "0.0.0.0",
        "--port", str(server_port),
        "--reload"
    ]
    
    subprocess.Popen(" ".join(cmd), shell=True, env=env)

def main():
    parser = argparse.ArgumentParser(description="SwanStudios MCP Server Launcher")
    parser.add_argument("--server", help="Name of the server to start.")
    parser.add_argument("--port", type=int, help="Port to run the server on.")
    parser.add_argument("--all", action="store_true", help="Start all configured servers.")
    args = parser.parse_args()

    if args.all:
        logger.info("Starting all MCP servers...")
        for name in SERVER_CONFIG:
            start_server(name, None)
    elif args.server:
        start_server(args.server, args.port)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()