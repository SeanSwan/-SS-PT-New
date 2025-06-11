@echo off
echo 🔍 Verifying Frontend Build Completion
echo =====================================
echo.

cd frontend

echo 📦 Current dist contents:
dir dist

echo.
echo 📋 Checking _redirects file in dist:
if exist "dist\_redirects" (
    echo ✅ _redirects found in dist
    echo 📄 Contents:
    type "dist\_redirects"
    echo.
) else (
    echo ❌ _redirects NOT found in dist
)

echo.
echo 🔨 Running build to ensure completion:
npm run build

echo.
echo 📋 Post-build _redirects verification:
if exist "dist\_redirects" (
    echo ✅ _redirects exists after build
    type "dist\_redirects"
) else (
    echo ❌ _redirects missing after build
)

echo.
echo 🏁 Build verification complete
pause
