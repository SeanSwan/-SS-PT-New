@echo off
echo 🚀 TESTING MODEL FIXES - SERVER STARTUP TEST
echo ================================================
echo.
echo This will test if the server can start with the fixed models.
echo We fixed:
echo 1. WorkoutSession - converted from MongoDB to PostgreSQL
echo 2. Exercise - changed ID from INTEGER to UUID  
echo 3. All models should now load properly in associations
echo.
echo Starting backend server test...
echo.

cd backend
echo Current directory: %cd%
echo.

echo 🔍 Testing model imports first...
node -e "
import('./models/associations.mjs')
  .then(({ default: getModels }) => getModels())
  .then(models => {
    console.log('✅ Models loaded:', Object.keys(models).length);
    console.log('✅ WorkoutSession available:', !!models.WorkoutSession);
    console.log('✅ Exercise available:', !!models.Exercise);
    console.log('🎉 MODEL LOADING SUCCESS!');
    process.exit(0);
  })
  .catch(error => {
    console.log('❌ Model loading failed:', error.message);
    process.exit(1);
  });
"

if %errorlevel% neq 0 (
    echo.
    echo ❌ Model test failed! Check the errors above.
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Model test passed! Now testing full server startup...
echo.
echo 📡 Starting server (will run for 10 seconds then stop)...

timeout /t 2 /nobreak >nul

start /b npm run dev

echo Waiting 10 seconds for server to initialize...
timeout /t 10 /nobreak

echo.
echo 🛑 Stopping test server...
taskkill /f /im node.exe >nul 2>&1

echo.
echo 🎯 TEST COMPLETE!
echo.
echo If you saw "Server running on port 10000" and no model errors,
echo then the fixes are working correctly!
echo.
echo ✅ Ready to run: npm run start-dev
echo.
pause
