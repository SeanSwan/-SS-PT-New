# MCP Server routes module
# Handle imports with fallbacks to prevent ImportError crashes

try:
    from .tools import router as tools_router
except ImportError as e:
    print(f"Warning: Could not import tools router: {e}")
    # Create a minimal router as fallback
    from fastapi import APIRouter
    tools_router = APIRouter()

try:
    from .metadata import router as metadata_router
except ImportError as e:
    print(f"Warning: Could not import metadata router: {e}")
    # Create a minimal router as fallback
    from fastapi import APIRouter
    metadata_router = APIRouter()

__all__ = ['tools_router', 'metadata_router']
