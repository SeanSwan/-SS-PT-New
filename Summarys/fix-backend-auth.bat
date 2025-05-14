@echo off
echo ===================================================
echo SWAN STUDIOS - BACKEND AUTHENTICATION FIX
echo ===================================================
echo.

cd backend
echo Fixing admin.mjs import...

powershell -Command "(Get-Content routes\admin.mjs) -replace 'import \{ isAdmin \} from', 'import { adminOnly as isAdmin } from' | Set-Content routes\admin.mjs.fixed"
powershell -Command "if(Test-Path routes\admin.mjs.fixed){ Move-Item -Force routes\admin.mjs.fixed routes\admin.mjs }"

echo.
echo Starting backend server with fixed authentication...
npm run dev

pause
