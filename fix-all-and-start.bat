@echo off
echo ===================================================
echo SWAN STUDIOS - FIX ALL AND START
echo ===================================================
echo.
echo This script fixes all issues and then runs npm start
echo.

echo Fixing backend authentication middleware imports...
cd backend\routes

echo 1. Fixing admin.mjs...
powershell -Command "(Get-Content admin.mjs) -replace 'import \{ isAdmin \} from', 'import { adminOnly as isAdmin } from' | Set-Content admin.mjs.fixed"
powershell -Command "if(Test-Path admin.mjs.fixed){ Move-Item -Force admin.mjs.fixed admin.mjs }"

echo 2. Fixing testNotificationRoutes.mjs...
powershell -Command "(Get-Content testNotificationRoutes.mjs) -replace 'import \{ protect, admin \} from', 'import { protect, adminOnly } from' | Set-Content testNotificationRoutes.mjs.fixed"
powershell -Command "(Get-Content testNotificationRoutes.mjs.fixed) -replace 'router\.post\(''\/admin'', protect, admin,', 'router.post(''/admin'', protect, adminOnly,' | Set-Content testNotificationRoutes.mjs.fixed2"
powershell -Command "(Get-Content testNotificationRoutes.mjs.fixed2) -replace 'router\.post\(''\/direct'', protect, admin,', 'router.post(''/direct'', protect, adminOnly,' | Set-Content testNotificationRoutes.mjs.fixed3"
powershell -Command "if(Test-Path testNotificationRoutes.mjs.fixed3){ Move-Item -Force testNotificationRoutes.mjs.fixed3 testNotificationRoutes.mjs }"
powershell -Command "Remove-Item -ErrorAction SilentlyContinue testNotificationRoutes.mjs.fixed"
powershell -Command "Remove-Item -ErrorAction SilentlyContinue testNotificationRoutes.mjs.fixed2"

cd ..\..

echo.
echo Starting the application with npm start...
echo.
npm start
