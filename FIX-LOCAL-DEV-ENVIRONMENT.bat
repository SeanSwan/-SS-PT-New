@echo off
echo 🔧 FIXING LOCAL DEV ENVIRONMENT - SwanStudios
echo =============================================
echo.

echo This script will fix common local development issues:
echo 1. Port conflicts between services
echo 2. MongoDB connection problems  
echo 3. MCP server startup failures
echo.

echo RECOMMENDED SOLUTIONS:
echo =====================

echo 🎯 OPTION 1: Quick Development (Recommended)
echo   Run: QUICK-DEV-START.bat
echo   - Starts only Backend + Frontend
echo   - Avoids MCP server port conflicts
echo   - Perfect for UI development and testing
echo.

echo 🎯 OPTION 2: Full Development Environment
echo   - Make sure MongoDB is running on port 27017
echo   - Make sure no other processes use ports 8000, 8002, 8005
echo   - Run: npm run start-without-yolo
echo.

echo 🎯 OPTION 3: Frontend Only (No Backend)
echo   Run: cd frontend && npm run dev
echo   - Use this if backend is running in production
echo   - Frontend will connect to production backend
echo.

echo COMMON FIXES:
echo =============

echo MongoDB Issues:
echo - Install MongoDB Community Edition
echo - Start MongoDB service: net start MongoDB
echo - Or use MongoDB Compass to start local instance

echo Port Conflicts:
echo - Run: CHECK-PORT-CONFLICTS.bat to see what's using ports
echo - Close other applications or restart computer
echo - Use Task Manager to end conflicting processes

echo MCP Server Issues:
echo - Python dependencies: cd backend/mcp_server && pip install -r requirements.txt
echo - Virtual environment recommended: python -m venv venv && venv\Scripts\activate

echo.
echo 💡 QUICKEST FIX: Use QUICK-DEV-START.bat for immediate development!
echo.
pause
