@echo off
echo 🔧 StoreFront Visibility Fix for Windows
echo =====================================
echo.

echo 1. Running diagnostic...
node diagnose-storefront.mjs

echo.
echo 2. Testing backend connection...
curl -s http://localhost:3000/api/health 2>nul || (
    echo ❌ Backend not responding
    echo Please start the backend: npm run server
    goto :end
)

echo ✅ Backend is running

echo.
echo 3. Testing StoreFront API...
curl -s http://localhost:3000/api/storefront | findstr /c:"success" >nul && (
    echo ✅ StoreFront API is responding
) || (
    echo ⚠️ StoreFront API issue detected
    echo Running seeder...
    cd backend
    node seeders/20250516-storefront-items.mjs
    cd ..
)

echo.
echo 4. Test URLs:
echo    • Main StoreFront: http://localhost:3000/store
echo    • Debug Version: http://localhost:3000/debug-store  
echo    • Simple Version: http://localhost:3000/simple-store
echo.

echo ✨ Open your browser and try the simple version first:
echo    http://localhost:3000/simple-store
echo.

echo If the simple version shows packages but the main doesn't:
echo - The issue is with styled-components or animations
echo - Check browser console for specific errors
echo.

echo If simple version is also blank:
echo - Check Context providers (AuthContext, CartContext)
echo - Look for JavaScript errors in browser console
echo - Verify API requests are completing successfully

:end
pause