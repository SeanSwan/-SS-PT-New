import sys
import os
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

# Configure logging and utilities with fallback imports
try:
    from utils.config import config
    from utils.mongodb import connect_to_mongodb, get_db, is_connected
except ImportError as e:
    print(f"Warning: Could not import utils: {e}")
    try:
        # Try alternative import path
        import sys
        from pathlib import Path
        current_dir = Path(__file__).parent
        sys.path.insert(0, str(current_dir))
        from utils.config import config
        from utils.mongodb import connect_to_mongodb, get_db, is_connected
    except ImportError as e2:
        print(f"Warning: Could not import utils (fallback): {e2}")
        # Create basic config if utils not available
        class Config:
            def get_log_level(self):
                return "INFO"
            def get_port(self):
                return int(os.environ.get("PORT", 8000))
            def get(self, key, default=None):
                return os.environ.get(key, default)
            def get_db_uri(self):
                return "mongodb://localhost:27017/swanstudios"
        
        config = Config()
        
        # Create dummy MongoDB functions if not available
        async def connect_to_mongodb():
            return {"db": None}
        
        def get_db():
            return None
        
        def is_connected():
            return False

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

# Import routes with fallback
try:
    from routes.tools import router as tools_router
    from routes.metadata import router as metadata_router
    
    # Include routers
    app.include_router(tools_router, tags=["tools"])
    app.include_router(metadata_router, tags=["metadata"])
except ImportError as e:
    logger.warning(f"Could not import routes: {e}")
    try:
        # Try alternative import path
        import sys
        from pathlib import Path
        current_dir = Path(__file__).parent
        sys.path.insert(0, str(current_dir))
        from routes.tools import router as tools_router
        from routes.metadata import router as metadata_router
        
        # Include routers
        app.include_router(tools_router, tags=["tools"])
        app.include_router(metadata_router, tags=["metadata"])
    except ImportError as e2:
        logger.warning(f"Could not import routes (fallback): {e2}")
        # Create minimal routes
        from fastapi import APIRouter
        tools_router = APIRouter()
        metadata_router = APIRouter()

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
    import time
    
    # Set startup time for metrics
    app.start_time = time.time()
    
    # Connect to MongoDB
    try:
        mongo_result = await connect_to_mongodb()
        if mongo_result["db"] is not None:
            mongodb_connected = True
            logger.info("MongoDB connection established")
            
            # Log the collections available  
            collections = mongo_result["db"].list_collection_names()
            logger.info(f"Available MongoDB collections: {collections}")
        else:
            logger.warning("Failed to connect to MongoDB. Some features may be unavailable.")
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {str(e)}")
        logger.warning("Running with limited functionality due to database connection failure")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources before server shutdown."""
    try:
        from utils.mongodb import close_mongodb_connection
        # Close MongoDB connection
        await close_mongodb_connection()
        logger.info("Resources cleaned up")
    except ImportError:
        logger.info("No MongoDB connection to close")

# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    """Check the health of the server and its dependencies."""
    mongo_status = "connected" if is_connected() else "disconnected"
    
    return {
        "status": "healthy",
        "mongodb": mongo_status,
        "version": "1.0.0",
        "environment": "Development" if config.get("DEBUG", False) else "Production",
        "server": "Workout MCP Server"
    }

# Metrics endpoint
@app.get("/metrics", tags=["metrics"])
async def get_metrics():
    """Get server metrics."""
    import time
    from datetime import datetime
    
    # Basic server metrics
    return {
        "server": "Workout MCP Server",
        "timestamp": datetime.now().isoformat(),
        "uptime_seconds": time.time() - (getattr(app, 'start_time', time.time())),
        "mongodb_connected": mongodb_connected,
        "version": "1.0.0",
        "environment": "Development" if config.get("DEBUG", False) else "Production"
    }

# Root endpoint for basic info
@app.get("/", tags=["info"])
async def root():
    """Get basic server information."""
    return {
        "name": "Workout MCP Server",
        "version": "1.0.0",
        "status": "running",
        "health_endpoint": "/health"
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
