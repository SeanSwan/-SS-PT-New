@echo off
echo 🔍 API DEBUG TRACER - Finding the REAL issue
echo ============================================
echo.

echo 🎯 This will test:
echo 1. Is your backend server running?
echo 2. Is the /api/storefront endpoint working?
echo 3. What data is the database returning?
echo 4. What should you check in browser dev tools?
echo.

node debug-api-tracer.mjs

echo.
echo 📋 NEXT: Check your browser Dev Tools
echo =====================================
echo 1. Open your store in browser: http://localhost:3000/shop
echo 2. Press F12 to open Dev Tools
echo 3. Go to Network tab
echo 4. Refresh the page
echo 5. Look for /api/storefront request
echo 6. Check what data it returns
echo.

pause
