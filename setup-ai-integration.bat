@echo off
echo 🚀 SwanStudios AI/MCP Integration Setup
echo ======================================

:: Check if .env files exist
echo 🔍 Checking environment files...

if not exist ".env" (
    echo ⚠️  Backend .env not found. Creating from example...
    copy .env.example .env > nul
    echo ✅ Created backend .env file
) else (
    echo ✅ Backend .env file exists
)

if not exist "frontend\.env.local" (
    echo ⚠️  Frontend .env.local not found. Creating from example...
    copy frontend\.env.example frontend\.env.local > nul
    echo ✅ Created frontend .env.local file
) else (
    echo ✅ Frontend .env.local file exists
)

:: Check if MCP configurations are present
echo 🔍 Checking MCP configuration...
findstr /C:"WORKOUT_MCP_URL" .env > nul
if errorlevel 1 (
    echo ⚠️  Adding MCP configuration to backend .env...
    echo. >> .env
    echo # MCP ^(Model Context Protocol^) Configuration >> .env
    echo WORKOUT_MCP_URL=http://localhost:8000 >> .env
    echo WORKOUT_MCP_ENABLED=true >> .env
    echo GAMIFICATION_MCP_URL=http://localhost:8002 >> .env
    echo GAMIFICATION_MCP_ENABLED=true >> .env
    echo ✅ Added MCP configuration
)

:: Check Node modules
echo 🔍 Checking Node.js dependencies...

if not exist "backend\node_modules" (
    echo 📦 Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo ✅ Backend dependencies installed
)

if not exist "frontend\node_modules" (
    echo 📦 Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo ✅ Frontend dependencies installed
)

:: Create startup scripts
echo 🔧 Creating startup scripts...

:: Backend startup script
echo @echo off > start-backend.bat
echo echo 🚀 Starting SwanStudios Backend... >> start-backend.bat
echo cd backend >> start-backend.bat
echo npm start >> start-backend.bat

:: Frontend startup script
echo @echo off > start-frontend.bat
echo echo 🚀 Starting SwanStudios Frontend... >> start-frontend.bat
echo cd frontend >> start-frontend.bat
echo npm run dev >> start-frontend.bat

:: MCP servers startup script
echo @echo off > start-mcp-servers.bat
echo echo 🤖 Starting MCP Servers... >> start-mcp-servers.bat
echo cd backend\mcp_server >> start-mcp-servers.bat
echo start /B python workout_mcp_server.py >> start-mcp-servers.bat
echo start /B python start_gamification_server.py >> start-mcp-servers.bat
echo echo ✅ MCP Servers started successfully! >> start-mcp-servers.bat
echo pause >> start-mcp-servers.bat

:: All-in-one startup script
echo @echo off > start-all.bat
echo echo 🚀 Starting Complete SwanStudios AI Platform... >> start-all.bat
echo start /B start-mcp-servers.bat >> start-all.bat
echo timeout /t 3 /nobreak >> start-all.bat
echo start /B start-backend.bat >> start-all.bat
echo timeout /t 5 /nobreak >> start-all.bat
echo start /B start-frontend.bat >> start-all.bat
echo echo 🎉 All services starting! >> start-all.bat
echo echo 🌐 Open http://localhost:5173 to access SwanStudios >> start-all.bat
echo echo ⚙️  Backend API: http://localhost:5000 >> start-all.bat
echo echo 🤖 MCP Status: http://localhost:5000/api/mcp/status >> start-all.bat
echo pause >> start-all.bat

echo ✅ Startup scripts created

:: Final instructions
echo 🎉 Setup Complete!
echo Next steps:
echo 1. Ensure your MCP servers are implemented in backend\mcp_server\
echo 2. Run 'start-all.bat' to start all services
echo 3. Or start services individually:
echo    - Backend: start-backend.bat
echo    - Frontend: start-frontend.bat
echo    - MCP Servers: start-mcp-servers.bat
echo.
echo 🌐 Access your application at http://localhost:5173
echo 🔧 API documentation at http://localhost:5000
echo 🤖 MCP Status at http://localhost:5000/api/mcp/status
echo.
echo 📚 Read AI_MCP_INTEGRATION_GUIDE.md for detailed documentation
pause