#!/usr/bin/env python3
"""
Render MCP Server - A proper MCP server for Render services
Uses STDIO transport for maximum compatibility with Roo Code
"""

import asyncio
import os
import sys
import json
import httpx
from dotenv import load_dotenv

# Debug logging to stderr (doesn't interfere with STDIO)
def log(msg):
    print(f"[render-mcp] {msg}", file=sys.stderr)

log("Starting Render MCP Server...")

# Load environment variables from .env file in the same directory
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, ".env")
load_dotenv(env_path)

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Get Render API key
RENDER_API_KEY = os.getenv("RENDER_API_KEY")
RENDER_API_BASE_URL = "https://api.render.com/v1"

log(f"API Key present: {bool(RENDER_API_KEY)}")

# Create the MCP server
server = Server("render-mcp")


async def call_render_api(method: str, path: str, params: dict = None) -> dict:
    """Make an API call to Render"""
    if not RENDER_API_KEY:
        return {"error": "RENDER_API_KEY environment variable is not set"}

    headers = {"Authorization": f"Bearer {RENDER_API_KEY}"}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.request(
                method,
                f"{RENDER_API_BASE_URL}{path}",
                headers=headers,
                params=params,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            return {"error": f"Render API error: {e.response.status_code} - {e.response.text}"}
        except Exception as e:
            return {"error": f"Request failed: {str(e)}"}


@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools for Render operations"""
    return [
        Tool(
            name="render_list_services",
            description="List all Render services in your account. Returns service IDs, names, types, and status.",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        ),
        Tool(
            name="render_get_service",
            description="Get details about a specific Render service by ID",
            inputSchema={
                "type": "object",
                "properties": {
                    "service_id": {
                        "type": "string",
                        "description": "The Render service ID (e.g., srv-xxxxx)"
                    }
                },
                "required": ["service_id"]
            }
        ),
        Tool(
            name="render_list_deploys",
            description="List recent deployments for a Render service",
            inputSchema={
                "type": "object",
                "properties": {
                    "service_id": {
                        "type": "string",
                        "description": "The Render service ID (e.g., srv-xxxxx)"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Number of deploys to return (default: 10)",
                        "default": 10
                    }
                },
                "required": ["service_id"]
            }
        ),
        Tool(
            name="render_get_deploy",
            description="Get details about a specific deployment",
            inputSchema={
                "type": "object",
                "properties": {
                    "service_id": {
                        "type": "string",
                        "description": "The Render service ID"
                    },
                    "deploy_id": {
                        "type": "string",
                        "description": "The deployment ID (e.g., dep-xxxxx)"
                    }
                },
                "required": ["service_id", "deploy_id"]
            }
        ),
        Tool(
            name="render_list_env_vars",
            description="List environment variables for a Render service (values are masked)",
            inputSchema={
                "type": "object",
                "properties": {
                    "service_id": {
                        "type": "string",
                        "description": "The Render service ID"
                    }
                },
                "required": ["service_id"]
            }
        ),
        Tool(
            name="render_get_events",
            description="Get recent events/logs for a Render service",
            inputSchema={
                "type": "object",
                "properties": {
                    "service_id": {
                        "type": "string",
                        "description": "The Render service ID"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Number of events to return (default: 20)",
                        "default": 20
                    }
                },
                "required": ["service_id"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls"""

    if name == "render_list_services":
        result = await call_render_api("GET", "/services")

    elif name == "render_get_service":
        service_id = arguments.get("service_id")
        if not service_id:
            return [TextContent(type="text", text="Error: service_id is required")]
        result = await call_render_api("GET", f"/services/{service_id}")

    elif name == "render_list_deploys":
        service_id = arguments.get("service_id")
        limit = arguments.get("limit", 10)
        if not service_id:
            return [TextContent(type="text", text="Error: service_id is required")]
        result = await call_render_api("GET", f"/services/{service_id}/deploys", {"limit": limit})

    elif name == "render_get_deploy":
        service_id = arguments.get("service_id")
        deploy_id = arguments.get("deploy_id")
        if not service_id or not deploy_id:
            return [TextContent(type="text", text="Error: service_id and deploy_id are required")]
        result = await call_render_api("GET", f"/services/{service_id}/deploys/{deploy_id}")

    elif name == "render_list_env_vars":
        service_id = arguments.get("service_id")
        if not service_id:
            return [TextContent(type="text", text="Error: service_id is required")]
        result = await call_render_api("GET", f"/services/{service_id}/env-vars")

    elif name == "render_get_events":
        service_id = arguments.get("service_id")
        limit = arguments.get("limit", 20)
        if not service_id:
            return [TextContent(type="text", text="Error: service_id is required")]
        result = await call_render_api("GET", f"/services/{service_id}/events", {"limit": limit})

    else:
        return [TextContent(type="text", text=f"Unknown tool: {name}")]

    # Format the result
    if isinstance(result, dict) and "error" in result:
        return [TextContent(type="text", text=f"Error: {result['error']}")]

    return [TextContent(type="text", text=json.dumps(result, indent=2))]


async def main():
    """Run the MCP server using STDIO transport"""
    log("Initializing STDIO transport...")
    try:
        async with stdio_server() as (read_stream, write_stream):
            log("STDIO connected, running server...")
            await server.run(read_stream, write_stream, server.create_initialization_options())
    except Exception as e:
        log(f"Error: {e}")
        raise


if __name__ == "__main__":
    log("Starting main()...")
    asyncio.run(main())
