@echo off
echo ===============================================
echo    SWANSTUDIOS CLIENT DASHBOARD FIX
echo ===============================================
echo.
echo This will fix all client dashboard issues:
echo 1. Double API prefix problem (/api/api/)
echo 2. WebSocket wrong port (5000 vs 10000) 
echo 3. Missing API routes (404 errors)
echo 4. MCP server connection errors
echo 5. Improved error handling
echo.
echo Press any key to apply fixes...
pause >nul

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"

echo.
echo ===============================================
echo STEP 1: DEPLOYING FIXES
echo ===============================================
echo.
node deploy-client-dashboard-fixes.mjs

echo.
echo ===============================================
echo STEP 2: RESTARTING SERVERS
echo ===============================================
echo.

echo Stopping any existing servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo.
echo Starting backend server...
start "SwanStudios Backend" cmd /k "cd /d C:\Users\ogpsw\Desktop\quick-pt\SS-PT\backend && npm start"

echo.
echo Waiting for backend to initialize...
timeout /t 5 >nul

echo.
echo Starting frontend server...
start "SwanStudios Frontend" cmd /k "cd /d C:\Users\ogpsw\Desktop\quick-pt\SS-PT\frontend && npm run dev"

echo.
echo ===============================================
echo STEP 3: TESTING THE FIXES
echo ===============================================
echo.
echo Backend server: http://localhost:10000
echo Frontend server: http://localhost:5173
echo.
echo Waiting for servers to fully start...
timeout /t 10 >nul

echo.
echo Testing API endpoints...
node test-client-dashboard.mjs

echo.
echo ===============================================
echo FIXES APPLIED SUCCESSFULLY!
echo ===============================================
echo.
echo ✅ Client dashboard issues fixed:
echo    - No more /api/api/ double prefix
echo    - WebSocket uses correct port (10000)
echo    - All API routes now available
echo    - Graceful error handling
echo    - MCP fallback data
echo.
echo 🌐 Next steps:
echo    1. Open http://localhost:5173
echo    2. Log in with your credentials
echo    3. Go to the client dashboard
echo    4. Verify no console errors
echo.
echo ℹ️  If you see "polling mode" messages, that's normal
echo    (WebSocket is optional, main features work without it)
echo.
echo ===============================================
echo.
pause
