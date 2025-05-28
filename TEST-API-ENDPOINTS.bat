@echo off
echo ===============================================
echo    QUICK CLIENT DASHBOARD TEST
echo ===============================================
echo.
echo Testing your new API endpoints...
echo.

echo 1. Testing Health Endpoint:
curl -s http://localhost:10000/health | findstr "status"

echo.
echo 2. Testing Dashboard Stats (expect 401 - auth required):
curl -s -w "Status: %%{http_code}\n" http://localhost:10000/api/dashboard/stats -o nul

echo.
echo 3. Testing Notifications (expect 401 - auth required):
curl -s -w "Status: %%{http_code}\n" http://localhost:10000/api/notifications -o nul

echo.
echo 4. Testing Gamification (expect 401 - auth required):
curl -s -w "Status: %%{http_code}\n" http://localhost:10000/api/gamification/user-stats -o nul

echo.
echo ===============================================
echo RESULTS EXPLANATION:
echo ===============================================
echo ✅ Status: 200 = SUCCESS (endpoint working)
echo 🔐 Status: 401 = AUTH REQUIRED (normal for protected routes)
echo ❌ Status: 404 = NOT FOUND (route missing - problem!)
echo ❌ Status: 500 = SERVER ERROR (code issue!)
echo.
echo If you see 401s, that's GOOD - it means the routes exist
echo and are properly protected with authentication.
echo.
pause
