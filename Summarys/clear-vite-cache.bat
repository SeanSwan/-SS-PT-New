@echo off
echo ========================================
echo     Clearing Vite Dev Server Cache
echo ========================================
echo.

echo [1/3] Stopping any running dev server...
taskkill /f /im node.exe 2>nul || echo No Node processes to kill

echo [2/3] Clearing Vite cache...
cd /d "%~dp0\frontend"
if exist ".vite-cache" (
    rmdir /s /q ".vite-cache"
    echo Vite cache cleared
) else (
    echo No Vite cache found
)

if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo Vite dependency cache cleared
) else (
    echo No Vite dependency cache found
)

echo [3/3] Restarting development server...
npm run dev

echo.
echo ========================================
echo   Development server restarted
echo   The DOM nesting error should be resolved
echo ========================================
pause
