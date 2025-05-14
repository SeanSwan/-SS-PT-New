@echo off
REM AI System Status Check Script
echo 🔍 SwanStudios AI System Status Check
echo ======================================

REM Check if MongoDB is running
echo 📊 Checking MongoDB...
netstat -an | find "27017" > nul
if %errorlevel% == 0 (
    echo ✅ MongoDB is running (port 27017)
) else (
    echo ❌ MongoDB is not running
)

REM Check if Backend server is running
echo 🔧 Checking Backend Server...
netstat -an | find "5000" > nul
if %errorlevel% == 0 (
    echo ✅ Backend server is running (port 5000)
) else (
    echo ❌ Backend server is not running
)

REM Check if Frontend server is running
echo 🖥️  Checking Frontend Server...
netstat -an | find "5173" > nul
if %errorlevel% == 0 (
    echo ✅ Frontend server is running (port 5173)
) else (
    echo ❌ Frontend server is not running
)

REM Check MCP Servers
echo 🤖 Checking MCP Servers...
netstat -an | find "8000" > nul
if %errorlevel% == 0 (
    echo ✅ Workout MCP Server is running (port 8000)
) else (
    echo ❌ Workout MCP Server is not running
)

netstat -an | find "8002" > nul
if %errorlevel% == 0 (
    echo ✅ Gamification MCP Server is running (port 8002)
) else (
    echo ❌ Gamification MCP Server is not running
)

echo ======================================
echo ✨ Status check complete!
pause