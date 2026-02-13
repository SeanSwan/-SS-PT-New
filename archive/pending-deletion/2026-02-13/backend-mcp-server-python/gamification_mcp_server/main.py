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
from pathlib import Path

# CRITICAL: Set up import paths BEFORE any other imports
# This must be done first to avoid import errors
current_dir = Path(__file__).parent
parent_dir = current_dir.parent

# Add both current and parent directories to sys.path
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

# Set PYTHONPATH environment variable for subprocesses
python_path = f"{current_dir}{os.pathsep}{parent_dir}"
if 'PYTHONPATH' in os.environ:
    os.environ['PYTHONPATH'] = f"{python_path}{os.pathsep}{os.environ['PYTHONPATH']}"
else:
    os.environ['PYTHONPATH'] = python_path

import uvicorn
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Set up basic logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("gamification_mcp_server")

# Import routes with fallback handling
try:
    # Try relative imports first
    from routes import tools_router, metadata_router
except ImportError as e:
    logger.warning(f"Could not import routes with relative import: {e}")
    try:
        # Try adding current directory to path
        import sys
        from pathlib import Path
        current_dir = Path(__file__).parent
        sys.path.insert(0, str(current_dir))
        from routes import tools_router, metadata_router
    except ImportError as e2:
        logger.warning(f"Could not import routes: {e} / {e2}")
        # Create minimal routes as fallback
        from fastapi import APIRouter
        tools_router = APIRouter()
        metadata_router = APIRouter()

try:
    # Try relative import first
    from utils import config
except ImportError as e:
    logger.warning(f"Could not import config with relative import: {e}")
    try:
        # Try direct import
        import sys
        from pathlib import Path
        current_dir = Path(__file__).parent
        sys.path.insert(0, str(current_dir))
        from utils import config
    except ImportError as e2:
        logger.warning(f"Could not import config: {e} / {e2}")
        # Create basic config fallback
        class Config:
            def get_log_level(self):
                return "INFO"
            def get_port(self):
                return int(os.environ.get("PORT", 8002))
            def is_production(self):
                return False
            def get_backend_api_url(self):
                return "http://localhost:5000/api"
        config = Config()

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

# Startup event to set start time
@app.on_event("startup")
async def startup_event():
    """Initialize startup tasks."""
    import time
    app.start_time = time.time()
    logger.info("Gamification MCP Server startup complete")

# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    """Check the health of the gamification server."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": "Development" if not config.is_production() else "Production"
    }

# Metrics endpoint
@app.get("/metrics", tags=["metrics"])
async def get_metrics():
    """Get server metrics."""
    import time
    from datetime import datetime
    
    # Basic server metrics
    return {
        "server": "Gamification MCP Server",
        "timestamp": datetime.now().isoformat(),
        "uptime_seconds": time.time() - (getattr(app, 'start_time', time.time())),
        "version": "1.0.0",
        "environment": "Development" if not config.is_production() else "Production"
    }

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
    
    # Check if we're running from the module directly or via the startup script
    if 'start_gamification_server' in sys.argv[0]:
        # Running from startup script, use simple app reference
        uvicorn.run(
            "main:app", 
            host="0.0.0.0", 
            port=port, 
            reload=debug_mode
        )
    else:
        # Running directly, use full module path
        uvicorn.run(
            "gamification_mcp_server.main:app", 
            host="0.0.0.0", 
            port=port, 
            reload=debug_mode
        )
