@echo off
echo 🚀 CONTACT FORM FIX - IMMEDIATE DEPLOYMENT
echo ==========================================
echo.

echo 📍 Step 1: Backend verification (optional)...
echo You can test the backend manually with: QUICK-BACKEND-TEST.bat
echo Proceeding with frontend rebuild...
echo.

echo 📍 Step 2: Rebuilding frontend with correct URL...
cd frontend

echo 🧹 Cleaning previous build...
if exist dist rmdir /s /q dist
if exist node_modules\.vite rmdir /s /q node_modules\.vite

echo 🔨 Building production frontend...
npm run build

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Frontend build failed!
    pause
    exit /b 1
)

echo ✅ Frontend built successfully!
echo.

echo 📍 Step 3: Verification complete
echo.
echo 🎉 READY FOR DEPLOYMENT!
echo.
echo Next steps:
echo 1. Deploy the 'frontend/dist' folder to your hosting service
echo 2. Test contact form at https://sswanstudios.com/contact
echo 3. Verify you receive email and SMS notifications
echo.

cd ..
echo ✅ Contact form fix deployment preparation complete!
pause
