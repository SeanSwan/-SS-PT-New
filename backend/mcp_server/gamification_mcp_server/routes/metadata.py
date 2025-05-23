"""
FastAPI routes for MCP metadata.
"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def root():
    """MCP Server root endpoint."""
    return {
        "name": "Gamification MCP Server",
        "version": "1.0.0",
        "description": "MCP server for the Wholesome Warrior's Path gamification system",
        "tools_endpoint": "/tools"
    }

@router.get("/tools")
async def list_tools():
    """List all available MCP tools."""
    return {
        "tools": [
            {
                "name": "LogActivity",
                "description": "Log an activity and calculate rewards.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "userId": {"type": "string"},
                        "activityType": {"type": "string", "enum": [
                            "workout", "stretch", "foam_roll", "log_vitamin", 
                            "log_greens", "log_meal", "hit_protein_goal", 
                            "post_workout_nutrition", "kindness_quest", "daily_good_deed", 
                            "share_experience", "daily_login", "complete_challenge", 
                            "set_completed", "rep_completed"
                        ]},
                        "timestamp": {"type": "string", "format": "date-time", "nullable": True},
                        "value": {"type": "integer", "default": 1},
                        "duration": {"type": "integer", "nullable": True},
                        "metadata": {"type": "object", "nullable": True}
                    },
                    "required": ["userId", "activityType"]
                }
            },
            {
                "name": "GetGamificationProfile",
                "description": "Get a user's complete gamification profile.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "userId": {"type": "string"}
                    },
                    "required": ["userId"]
                }
            },
            {
                "name": "GetAchievements",
                "description": "Get available achievements and user progress.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "userId": {"type": "string", "nullable": True},
                        "category": {"type": "string", "enum": [
                            "fitness", "recovery", "nutrition", "habit", "community"
                        ], "nullable": True}
                    }
                }
            },
            {
                "name": "GetBoardPosition",
                "description": "Get a user's position on the gamification board.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "userId": {"type": "string"}
                    },
                    "required": ["userId"]
                }
            },
            {
                "name": "RollDice",
                "description": "Roll dice to move on the gamification board.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "userId": {"type": "string"},
                        "energyTokensToSpend": {"type": "integer", "default": 1}
                    },
                    "required": ["userId"]
                }
            },
            {
                "name": "GetChallenges",
                "description": "Get available challenges.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "userId": {"type": "string", "nullable": True},
                        "active": {"type": "boolean", "default": True}
                    }
                }
            },
            {
                "name": "JoinChallenge",
                "description": "Join a challenge.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "userId": {"type": "string"},
                        "challengeId": {"type": "string"}
                    },
                    "required": ["userId", "challengeId"]
                }
            },
            {
                "name": "GetKindnessQuests",
                "description": "Get available kindness quests.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "userId": {"type": "string", "nullable": True},
                        "count": {"type": "integer", "default": 3}
                    }
                }
            }
        ]
    }

@router.get("/schema")
async def schema():
    """Get the OpenAPI schema for this MCP server."""
    # This would actually return app.openapi() in the main app
    return {
        "openapi": "3.0.0",
        "info": {
            "title": "Gamification MCP Server",
            "description": "MCP server for the Wholesome Warrior's Path gamification system",
            "version": "1.0.0"
        },
        "paths": {
            "/tools/LogActivity": {
                "post": {
                    "summary": "Log an activity and calculate rewards",
                    "operationId": "log_activity",
                    "tags": ["tools"]
                }
            },
            "/tools/GetGamificationProfile": {
                "post": {
                    "summary": "Get a user's complete gamification profile",
                    "operationId": "get_gamification_profile",
                    "tags": ["tools"]
                }
            },
            "/tools/GetAchievements": {
                "post": {
                    "summary": "Get available achievements and user progress",
                    "operationId": "get_achievements",
                    "tags": ["tools"]
                }
            },
            "/tools/GetBoardPosition": {
                "post": {
                    "summary": "Get a user's position on the gamification board",
                    "operationId": "get_board_position",
                    "tags": ["tools"]
                }
            },
            "/tools/RollDice": {
                "post": {
                    "summary": "Roll dice to move on the gamification board",
                    "operationId": "roll_dice",
                    "tags": ["tools"]
                }
            },
            "/tools/GetChallenges": {
                "post": {
                    "summary": "Get available challenges",
                    "operationId": "get_challenges",
                    "tags": ["tools"]
                }
            },
            "/tools/JoinChallenge": {
                "post": {
                    "summary": "Join a challenge",
                    "operationId": "join_challenge",
                    "tags": ["tools"]
                }
            },
            "/tools/GetKindnessQuests": {
                "post": {
                    "summary": "Get available kindness quests",
                    "operationId": "get_kindness_quests",
                    "tags": ["tools"]
                }
            }
        }
    }
