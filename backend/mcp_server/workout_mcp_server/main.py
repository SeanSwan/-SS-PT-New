"""
Workout MCP Server
=================

A Python-based MCP server that exposes workout tracking functionality through
the Model Context Protocol (MCP).

This server provides tools for:
- Retrieving workout recommendations
- Managing workout sessions
- Analyzing progress data
- Generating workout plans

The server is designed with a modular architecture for maintainability and
follows best practices for security and error handling.
"""

import os
import sys
import logging
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Configure logging
from utils.config import config

# Set up logging
logging.basicConfig(
    level=getattr(logging, config.get_log_level()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("workout_mcp_server")

# Create FastAPI app
app = FastAPI(title="Workout MCP Server")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routes
from routes.tools import router as tools_router
from routes.metadata import router as metadata_router

# Include routers
app.include_router(tools_router, tags=["tools"])
app.include_router(metadata_router, tags=["metadata"])

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions with proper JSON response."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    """Handle generic exceptions with proper JSON response."""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

if __name__ == "__main__":
    # Display startup message
    port = config.get_port()
    debug = config.get("DEBUG", False)
    env = "Development" if debug else "Production"
    
    logger.info(f"Starting Workout MCP Server [{env} Mode]")
    logger.info(f"Server will be available at http://localhost:{port}")
    
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level=config.get_log_level().lower())
