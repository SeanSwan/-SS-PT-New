@echo off
echo.
echo Starting application with all fixes applied...
echo.

echo 1. Running fix-remaining-models.mjs (fixes missing model exports)...
cd backend
node fix-remaining-models.mjs
if %ERRORLEVEL% neq 0 (
  echo Error running fix-remaining-models.mjs
  exit /b %ERRORLEVEL%
)

echo 2. Running fix-all.mjs (fixes admin user and database)...
node fix-all.mjs
if %ERRORLEVEL% neq 0 (
  echo Error running fix-all.mjs
  exit /b %ERRORLEVEL%
)

echo 3. Running fix-auth-routes.mjs (fixes authentication and API routes)...
node fix-auth-routes.mjs
if %ERRORLEVEL% neq 0 (
  echo Error running fix-auth-routes.mjs
  exit /b %ERRORLEVEL%
)

echo 4. Starting the application...
cd ..
npm run start

echo.
echo If the application started successfully, you can log in with:
echo Username: ogpswan
echo Password: Password123!
echo.
