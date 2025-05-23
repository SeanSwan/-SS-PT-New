#!/usr/bin/env python3
"""
Test script for MCP server imports.

This script tests if the MCP servers can be imported and started without errors.
It's useful for debugging import issues.
"""

import sys
import os
from pathlib import Path

def test_workout_server_imports():
    """Test workout server imports."""
    print("="*60)
    print("Testing Workout MCP Server Imports")
    print("="*60)
    
    # Add workout server directory to path
    workout_dir = Path(__file__).parent / "workout_mcp_server"
    sys.path.insert(0, str(workout_dir))
    
    try:
        # Test config import
        print("Testing config import...")
        from utils.config import config
        print(f"✓ Config imported successfully (port: {config.get_port()})")
    except Exception as e:
        print(f"✗ Config import failed: {e}")
    
    try:
        # Test mongodb import
        print("Testing mongodb import...")
        from utils.mongodb import connect_to_mongodb, get_db, is_connected
        print("✓ MongoDB utilities imported successfully")
    except Exception as e:
        print(f"✗ MongoDB import failed: {e}")
    
    try:
        # Test models import
        print("Testing models import...")
        from models import (
            GetWorkoutRecommendationsInput,
            GetWorkoutRecommendationsOutput
        )
        print("✓ Models imported successfully")
    except Exception as e:
        print(f"✗ Models import failed: {e}")
    
    try:
        # Test tools import
        print("Testing tools import...")
        from tools import get_workout_recommendations
        print("✓ Tools imported successfully")
    except Exception as e:
        print(f"✗ Tools import failed: {e}")
    
    try:
        # Test routes import
        print("Testing routes import...")
        from routes.tools import router as tools_router
        from routes.metadata import router as metadata_router
        print("✓ Routes imported successfully")
    except Exception as e:
        print(f"✗ Routes import failed: {e}")

def test_gamification_server_imports():
    """Test gamification server imports."""
    print("\n" + "="*60)
    print("Testing Gamification MCP Server Imports")
    print("="*60)
    
    # Add gamification server directory to path
    gamify_dir = Path(__file__).parent / "gamification_mcp_server"
    sys.path.insert(0, str(gamify_dir))
    
    try:
        # Test config import
        print("Testing config import...")
        from utils.config import config
        print(f"✓ Config imported successfully (port: {config.get_port()})")
    except Exception as e:
        print(f"✗ Config import failed: {e}")
    
    try:
        # Test models import
        print("Testing models import...")
        from models import (
            LogActivityInput,
            LogActivityOutput
        )
        print("✓ Models imported successfully")
    except Exception as e:
        print(f"✗ Models import failed: {e}")
    
    try:
        # Test tools import
        print("Testing tools import...")
        from tools import log_activity
        print("✓ Tools imported successfully")
    except Exception as e:
        print(f"✗ Tools import failed: {e}")
    
    try:
        # Test routes import
        print("Testing routes import...")
        from routes import tools_router, metadata_router
        print("✓ Routes imported successfully")
    except Exception as e:
        print(f"✗ Routes import failed: {e}")

def main():
    """Main function."""
    print("MCP Server Import Testing")
    print("="*60)
    
    # Clear sys.path to start fresh
    original_path = sys.path.copy()
    
    try:
        test_workout_server_imports()
        
        # Reset path and test gamification
        sys.path = original_path.copy()
        test_gamification_server_imports()
        
        print("\n" + "="*60)
        print("Import testing completed")
        print("="*60)
        
    except Exception as e:
        print(f"Error during testing: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
