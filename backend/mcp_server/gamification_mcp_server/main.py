"""
Gamification MCP Server
======================

A Python-based MCP server that implements the "Wholesome Warrior's Path" gamification 
system for the fitness application.

This server provides tools for:
- Tracking and rewarding activities across multiple domains (workout, recovery, nutrition, supplements, community)
- Managing Energy Tokens (ET) and Experience Points (XP)
- Tracking achievements, streaks, and levels
- Calculating rewards for various user actions
- Managing the gamification board/map

To run this server:
```
python main.py
```

The server will run on port 8001.
"""

import os
import sys
import logging
from typing import Dict, Any

import uvicorn
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .routes import tools_router, metadata_router
from .utils import config

# Set up logging
logging.basicConfig(
    level=getattr(logging, config.get_log_level()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("gamification_mcp_server")

# Create FastAPI app
app = FastAPI(title="Gamification MCP Server")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(metadata_router, tags=["metadata"])
app.include_router(tools_router, prefix="/tools", tags=["tools"])

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTP exceptions with proper JSON response."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle generic exceptions with proper JSON response."""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

if __name__ == "__main__":
    # Run the server
    port = config.get_port()
    debug_mode = config.is_production() is False
    
    logger.info(f"Starting Gamification MCP Server on port {port} (debug: {debug_mode})")
    logger.info(f"Backend API URL: {config.get_backend_api_url()}")
    
    uvicorn.run(
        "gamification_mcp_server.main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=debug_mode
    )
