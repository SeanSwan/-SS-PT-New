@echo off
echo ===================================================
echo SWAN STUDIOS - ENSURING ADMIN USER EXISTS
echo ===================================================
echo.
echo Running admin seeder to ensure ogpswan admin account exists...
echo.
cd backend
node scripts/adminSeeder.mjs
echo.
echo Admin account check complete!
echo Username: ogpswan
echo Password: Password123!
echo.
echo ===================================================
pause
