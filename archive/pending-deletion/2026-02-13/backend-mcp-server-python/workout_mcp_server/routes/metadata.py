"""
Metadata routes for the Workout MCP Server.

These routes provide information about the server and its capabilities.
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

# Handle imports with fallbacks
try:
    # Try relative imports first
    from ..models.input_output import (
        GetWorkoutRecommendationsInput, GetWorkoutRecommendationsOutput,
        GetClientProgressInput, GetClientProgressOutput,
        GetWorkoutStatisticsInput, GetWorkoutStatisticsOutput,
        LogWorkoutSessionInput, LogWorkoutSessionOutput,
        GenerateWorkoutPlanInput, GenerateWorkoutPlanOutput
    )
    MODELS_AVAILABLE = True
except ImportError as e:
    # Try alternative imports for different execution contexts
    try:
        import sys
        from pathlib import Path
        # Add parent directories to sys.path
        current_dir = Path(__file__).parent.parent
        sys.path.insert(0, str(current_dir))
        
        from models.input_output import (
            GetWorkoutRecommendationsInput, GetWorkoutRecommendationsOutput,
            GetClientProgressInput, GetClientProgressOutput,
            GetWorkoutStatisticsInput, GetWorkoutStatisticsOutput,
            LogWorkoutSessionInput, LogWorkoutSessionOutput,
            GenerateWorkoutPlanInput, GenerateWorkoutPlanOutput
        )
        MODELS_AVAILABLE = True
    except ImportError as e2:
        print(f"Warning: Could not import models: {e} / {e2}")
    MODELS_AVAILABLE = False

router = APIRouter()

@router.get("/")
async def root():
    """MCP Server root endpoint."""
    return {
        "name": "Workout MCP Server",
        "version": "1.0.0",
        "description": "MCP server for workout tracking functionality",
        "tools_endpoint": "/tools",
        "health_endpoint": "/health",
        "models_available": MODELS_AVAILABLE
    }

@router.get("/tools")
async def list_tools():
    """List all available MCP tools."""
    if not MODELS_AVAILABLE:
        return {
            "error": "Models not available - server running in degraded mode",
            "tools": []
        }
    
    return {
        "tools": [
            {
                "name": "GetWorkoutRecommendations",
                "description": "Get personalized exercise recommendations for a user.",
                "input_schema": GetWorkoutRecommendationsInput.schema(),
                "output_schema": GetWorkoutRecommendationsOutput.schema()
            },
            {
                "name": "GetClientProgress",
                "description": "Get a client's progress data.",
                "input_schema": GetClientProgressInput.schema(),
                "output_schema": GetClientProgressOutput.schema()
            },
            {
                "name": "GetWorkoutStatistics",
                "description": "Get comprehensive workout statistics for a user.",
                "input_schema": GetWorkoutStatisticsInput.schema(),
                "output_schema": GetWorkoutStatisticsOutput.schema()
            },
            {
                "name": "LogWorkoutSession",
                "description": "Log a workout session for a user.",
                "input_schema": LogWorkoutSessionInput.schema(),
                "output_schema": LogWorkoutSessionOutput.schema()
            },
            {
                "name": "GenerateWorkoutPlan",
                "description": "Generate a personalized workout plan for a client.",
                "input_schema": GenerateWorkoutPlanInput.schema(),
                "output_schema": GenerateWorkoutPlanOutput.schema()
            }
        ]
    }

@router.get("/schema")
async def schema(request: Request):
    """Get the OpenAPI schema for this MCP server."""
    return request.app.openapi()

@router.get("/status")
async def status():
    """Get the current server status."""
    return {
        "status": "running",
        "models_available": MODELS_AVAILABLE,
        "can_process_requests": MODELS_AVAILABLE,
        "timestamp": "2025-05-15T19:39:20.294Z"
    }
