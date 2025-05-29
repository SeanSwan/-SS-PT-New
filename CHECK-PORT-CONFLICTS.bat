@echo off
echo 🔧 FIXING PORT CONFLICTS - SwanStudios Platform
echo ==============================================
echo.

echo Checking which processes are using our ports...
echo =============================================

echo Checking port 8000 (Workout MCP):
netstat -ano | findstr ":8000"

echo.
echo Checking port 8002 (Gamification MCP):
netstat -ano | findstr ":8002"

echo.
echo Checking port 8005 (YOLO MCP):
netstat -ano | findstr ":8005"

echo.
echo Checking port 10000 (Backend):
netstat -ano | findstr ":10000"

echo.
echo Checking port 5173 (Frontend):
netstat -ano | findstr ":5173"

echo.
echo If you see processes using these ports, you can either:
echo 1. Close those applications manually
echo 2. Kill the processes using: taskkill /PID [PID_NUMBER] /F
echo 3. Use different ports (recommended)
echo.

echo Recommended: Run FIX-CRITICAL-ISSUES-NOW.bat first to fix database,
echo then come back to this if you still have port conflicts.
echo.
pause
