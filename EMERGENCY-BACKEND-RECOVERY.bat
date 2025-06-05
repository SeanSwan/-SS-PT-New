@echo off
echo 🚨 EMERGENCY BACKEND RECOVERY PLAN
echo ==================================

echo.
echo 🔥 PROBLEM IDENTIFIED: Backend server not running on Render
echo ============================================================
echo The "x-render-routing: no-server" error means your backend crashed or failed to start.
echo This is likely due to database migration issues blocking server startup.

echo.
echo 📋 STEP 1: Check Render Dashboard Status
echo ========================================
echo 1. Go to: https://dashboard.render.com
echo 2. Click on your "swan-studios-api" service
echo 3. Check "Logs" tab for error messages
echo 4. Look for the latest deployment status
echo.
echo Common error patterns to look for:
echo   - "Migration failed"
echo   - "Database connection error" 
echo   - "Port already in use"
echo   - "Environment variable missing"

echo.
echo 📋 STEP 2: Force Database Migration (CRITICAL)
echo ==============================================
echo The database migration is likely blocking server startup.
echo Run this command to force complete the migration:

echo.
echo npx sequelize-cli db:migrate --config config/config.cjs --env production
echo.

echo 📋 STEP 3: Emergency Database Connection Test
echo =============================================
echo Test if database is accessible:
echo.
echo psql "%%DATABASE_URL%%" -c "SELECT 1;"
echo.

echo 📋 STEP 4: Redeploy Backend
echo ===========================
echo After fixing migration issues:
echo 1. Go to Render Dashboard
echo 2. Click "Manual Deploy" button
echo 3. Wait for deployment to complete (2-3 minutes)
echo 4. Check logs for successful startup

echo.
echo 📋 STEP 5: Verify Fix
echo ====================
echo curl -I https://swan-studios-api.onrender.com/health
echo.
echo Expected: HTTP 200 response (not 404)

echo.
echo 🚨 MOST LIKELY CAUSE:
echo =====================
echo Your Ultimate UUID Fix migration needs to complete before the server can start.
echo The server is probably crashing during database initialization.

pause