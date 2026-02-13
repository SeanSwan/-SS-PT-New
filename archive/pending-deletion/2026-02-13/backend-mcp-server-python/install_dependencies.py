#!/usr/bin/env python3
"""
Install MCP Server Dependencies
"""

import subprocess
import sys
from pathlib import Path

def install_requirements(requirements_file):
    """Install requirements from a file."""
    print(f"Installing dependencies from {requirements_file}...")
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ])
        print(f"✓ Successfully installed dependencies from {requirements_file}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install dependencies from {requirements_file}: {e}")
        return False

def main():
    """Install all MCP server dependencies."""
    script_dir = Path(__file__).parent
    
    # List of requirements files to install
    requirements_files = [
        script_dir / "workout_requirements.txt",
        script_dir / "gamification_mcp_server" / "requirements.txt"
    ]
    
    print("Installing MCP Server Dependencies...")
    print("=" * 50)
    
    success_count = 0
    for req_file in requirements_files:
        if req_file.exists():
            if install_requirements(req_file):
                success_count += 1
        else:
            print(f"✗ Requirements file not found: {req_file}")
    
    print("=" * 50)
    print(f"Installation complete: {success_count}/{len(requirements_files)} successful")
    
    if success_count < len(requirements_files):
        print("Some installations failed. You may need to install dependencies manually.")
        sys.exit(1)
    else:
        print("All dependencies installed successfully!")

if __name__ == "__main__":
    main()
