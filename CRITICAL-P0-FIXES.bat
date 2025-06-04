@echo off
echo 🚨 COMPREHENSIVE P0 CRITICAL FIXES
echo ===================================
echo.
echo This will fix ALL critical issues:
echo   ✅ P0: Users table case-sensitivity
echo   ✅ P0: Foreign key references  
echo   ✅ P0: Missing columns (checkoutSessionId)
echo   ✅ P0: MCP servers startup
echo   ✅ P1: Pricing fixes
echo   ✅ P1: Backend restart with fixes
echo.

pause

echo.
echo 📋 STEP 1: Checking Users table issue...
echo ========================================
node fix-users-table-issue.mjs

echo.
echo.
echo 🔧 STEP 2: Fixing foreign key references...
echo ===========================================
node fix-foreign-keys.mjs

echo.
echo.
echo 🚀 STEP 3: Starting MCP servers...
echo ===================================
echo Opening MCP servers in separate windows...
call START-ALL-MCP-SERVERS.bat

echo.
echo.
echo 💰 STEP 4: Fixing pricing...
echo ============================
node emergency-pricing-fix.mjs

echo.
echo.
echo 🔄 STEP 5: Restarting backend with all fixes...
echo ===============================================
echo.
echo ⚠️  Backend will start in this window
echo ⚠️  Keep this window open!
echo ⚠️  Press Ctrl+C to stop backend
echo.

cd backend
echo Starting backend server with all fixes applied...
echo.

node server.mjs

echo.
echo 🚨 If backend stopped, check error messages above
echo.
pause
