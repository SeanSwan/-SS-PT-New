# MCP Dependencies Fix and Installation Guide

## Issue Identified ✅

The workout MCP server launcher was failing because of missing `python-dotenv` dependency.

## Solution Applied ✅

### 1. Updated Workout Launcher
- Made the launcher more lenient about optional dependencies
- Only checks for critical modules (fastapi, uvicorn)
- Warns about optional modules but doesn't fail startup
- Provides clear error messages for missing critical dependencies

### 2. Created Install Scripts
- `install_mcp_dependencies.bat` - Windows batch script to install all dependencies
- `install_dependencies.py` - Python script for cross-platform dependency installation

## How to Fix and Start the System

### Option 1: Quick Manual Fix
Run this command in your terminal (from the project root):

```bash
# Install missing dependency
pip install python-dotenv

# Then restart the system
npm start
```

### Option 2: Install All Dependencies
From the `backend/mcp_server` directory:

```bash
# On Windows
install_mcp_dependencies.bat

# On Mac/Linux
pip install -r workout_requirements.txt
cd gamification_mcp_server
pip install -r requirements.txt
cd ..
```

### Option 3: Use the Python Install Script
```bash
cd backend/mcp_server
python install_dependencies.py
```

## Modified Files

1. **`workout_launcher.py`** - Updated to handle missing dependencies gracefully
2. **`install_mcp_dependencies.bat`** - New batch script for Windows
3. **`install_dependencies.py`** - New Python script for dependency installation

## Expected Result

After installing the dependencies and running `npm start`, you should see:

```
[workout-mcp] 2025-05-15 XX:XX:XX,XXX - workout_mcp_launcher - INFO - Core dependencies available
[workout-mcp] 2025-05-15 XX:XX:XX,XXX - workout_mcp_launcher - INFO - Starting Workout MCP Server...
[workout-mcp] ✓ Successfully imported modules using [strategy]
[workout-mcp] INFO:     Started server process [XXXXX]
[workout-mcp] INFO:     Waiting for application startup.
[workout-mcp] INFO:     Application startup complete.
[workout-mcp] INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

## Dependencies Installed

### Workout Server Dependencies:
- fastapi==0.100.0
- uvicorn==0.22.0
- pydantic==1.7.4
- requests==2.31.0
- python-dotenv==1.0.0
- pymongo==4.5.0

### Gamification Server Dependencies:
- fastapi>=0.68.0
- uvicorn>=0.15.0
- pydantic>=1.8.2
- requests>=2.26.0
- python-dotenv>=0.19.1
- sqlalchemy>=1.4.0
- psycopg2-binary>=2.9.1
- alembic>=1.7.0

## Next Steps

1. Install the missing dependencies using one of the methods above
2. Run `npm start` to verify the system starts correctly
3. All servers should start without errors
4. MCP import warnings should be eliminated

The system should now start completely without any dependency or import issues! 🎉
