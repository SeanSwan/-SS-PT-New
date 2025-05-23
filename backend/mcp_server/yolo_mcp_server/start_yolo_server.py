#!/usr/bin/env python
"""
YOLO MCP Server Launcher
========================

Production-optimized launcher for the YOLO AI Form/Posture Analysis MCP Server.
Handles model pre-loading, health checks, and graceful shutdown.
"""

import os
import sys
import time
import signal
import logging
import multiprocessing
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn
from yolo_mcp_server import app, yolo_analyzer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global variables for graceful shutdown
server_process = None
should_exit = False

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global should_exit
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    should_exit = True
    
    if server_process:
        try:
            server_process.terminate()
            server_process.join(timeout=10)
            if server_process.is_alive():
                logger.warning("Server didn't shut down gracefully, forcing termination")
                server_process.kill()
        except Exception as e:
            logger.error(f"Error during server shutdown: {e}")

def pre_load_model():
    """Pre-load the YOLO model before starting the server."""
    logger.info("Pre-loading YOLO model...")
    try:
        yolo_analyzer.load_model()
        logger.info("YOLO model loaded successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to pre-load YOLO model: {e}")
        return False

def verify_environment():
    """Verify environment setup and requirements."""
    logger.info("Verifying environment...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        logger.error("Python 3.8 or higher is required")
        return False
    
    # Check required environment variables
    required_vars = []
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        return False
    
    # Check write permissions for logs
    log_dir = Path("logs")
    try:
        log_dir.mkdir(exist_ok=True)
        test_file = log_dir / "test.tmp"
        test_file.write_text("test")
        test_file.unlink()
    except Exception as e:
        logger.error(f"Cannot write to logs directory: {e}")
        return False
    
    logger.info("Environment verification completed successfully")
    return True

def run_server():
    """Run the YOLO MCP server with production settings."""
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8005))
    workers = int(os.getenv("WORKERS", 1))
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    
    # Try to find an alternative port if the default is in use
    max_port_attempts = 5
    original_port = port
    
    for attempt in range(max_port_attempts):
        try:
            # Try to bind to the port to see if it's available
            import socket
            test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            test_socket.bind((host, port))
            test_socket.close()
            # If we get here, the port is available
            break
        except socket.error:
            if attempt < max_port_attempts - 1:
                logger.warning(f"Port {port} is already in use, trying {port + 1}")
                port += 1
            else:
                logger.error(f"Could not find an available port after {max_port_attempts} attempts")
                raise
    
    if port != original_port:
        logger.info(f"Using alternative port: {port} instead of {original_port}")
    
    # Configure uvicorn
    config = uvicorn.Config(
    app,
    host=host,
    port=port,
    log_level=log_level,
    access_log=True,
    reload=False,  # Never use reload in production
    # Remove uvloop for compatibility - not available on all systems
    # loop="uvloop",  # Use uvloop for better performance
    ws_ping_interval=20,
        ws_ping_timeout=10
        )
    
    # Start server
    logger.info(f"Starting YOLO MCP Server on {host}:{port}")
    server = uvicorn.Server(config)
    
    try:
        server.run()
    except KeyboardInterrupt:
        logger.info("Server interrupted by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        raise

def main():
    """Main entry point for the YOLO MCP server launcher."""
    logger.info("Starting YOLO MCP Server launcher...")
    
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        # Verify environment
        if not verify_environment():
            sys.exit(1)
        
        # Pre-load model if configured
        if os.getenv("WARM_UP_MODEL", "true").lower() == "true":
            if not pre_load_model():
                logger.warning("Model pre-loading failed, server will load on first request")
        
        # Run server
        run_server()
        
    except Exception as e:
        logger.error(f"Launcher error: {e}")
        sys.exit(1)
    finally:
        logger.info("YOLO MCP Server launcher shutdown complete")

if __name__ == "__main__":
    main()
