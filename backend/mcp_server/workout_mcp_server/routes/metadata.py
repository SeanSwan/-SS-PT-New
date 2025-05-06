"""
Metadata routes for the Workout MCP Server.

These routes provide information about the server and its capabilities.
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from models.input_output import (
    GetWorkoutRecommendationsInput, GetWorkoutRecommendationsOutput,
    GetClientProgressInput, GetClientProgressOutput,
    GetWorkoutStatisticsInput, GetWorkoutStatisticsOutput,
    LogWorkoutSessionInput, LogWorkoutSessionOutput,
    GenerateWorkoutPlanInput, GenerateWorkoutPlanOutput
)

router = APIRouter()

@router.get("/")
async def root():
    """MCP Server root endpoint."""
    return {
        "name": "Workout MCP Server",
        "version": "1.0.0",
        "description": "MCP server for workout tracking functionality",
        "tools_endpoint": "/tools"
    }

@router.get("/tools")
async def list_tools():
    """List all available MCP tools."""
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
