@echo off
echo 🚨 CRITICAL: Fixing Production Database
echo ========================================
echo.
echo Running production database fix...
node fix-production-database.mjs
echo.
echo Press any key to continue with deployment...
pause
