@echo off
echo ===================================================
echo SWAN STUDIOS - APPLICATION RESTART
echo ===================================================
echo.
echo Stopping all existing application processes...

echo Killing frontend and backend processes...
call kill-ports.bat

echo.
echo Clearing any temporary files...
if exist "C:\Users\ogpsw\Desktop\quick-pt\SS-PT\frontend\.vite" (
  rmdir /s /q "C:\Users\ogpsw\Desktop\quick-pt\SS-PT\frontend\.vite"
  echo Cleared Vite cache files.
)

echo.
echo Ensuring admin user exists...
cd backend
node scripts/adminSeeder.mjs
cd ..

echo.
echo ===================================================
echo Restarting application...
echo Username: ogpswan
echo Password: Password123!
echo ===================================================
echo.
npm run start
