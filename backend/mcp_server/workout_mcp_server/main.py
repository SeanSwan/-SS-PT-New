import sys
import os
from pathlib import Path

# Add the parent directory to sys.path for imports
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(current_dir))
sys.path.insert(0, str(parent_dir))

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
import asyncio
import uvicorn
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Configure logging and utilities
from utils.config import config
from utils.mongodb import connect_to_mongodb, get_db, is_connected

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

# Database connection state
mongodb_connected = False

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

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize database connections and other startup tasks."""
    global mongodb_connected
    
    # Connect to MongoDB
    try:
        mongo_result = await connect_to_mongodb()
        if mongo_result["db"]:
            mongodb_connected = True
            logger.info("MongoDB connection established")
            
            # Log the collections available
            collections = await mongo_result["db"].list_collection_names()
            logger.info(f"Available MongoDB collections: {collections}")
        else:
            logger.warning("Failed to connect to MongoDB. Some features may be unavailable.")
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {str(e)}")
        logger.warning("Running with limited functionality due to database connection failure")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources before server shutdown."""
    from utils.mongodb import close_mongodb_connection
    
    # Close MongoDB connection
    await close_mongodb_connection()
    logger.info("Resources cleaned up")

# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    """Check the health of the server and its dependencies."""
    mongo_status = "connected" if is_connected() else "disconnected"
    
    return {
        "status": "healthy",
        "mongodb": mongo_status,
        "version": "1.0.0",
        "environment": "Development" if config.get("DEBUG", False) else "Production"
    }

if __name__ == "__main__":
    # Display startup message
    port = config.get_port()
    debug = config.get("DEBUG", False)
    env = "Development" if debug else "Production"
    
    logger.info(f"Starting Workout MCP Server [{env} Mode]")
    logger.info(f"Server will be available at http://localhost:{port}")
    
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level=config.get_log_level().lower())
