@echo off
echo 🦢 RESTORING LUXURY SWAN PACKAGES...
echo ===================================
REM Use current script directory - works on ANY PC (work/home)
cd /d "%~dp0"
node restore-swan-packages.mjs
echo.
echo ✅ Package restoration complete!
echo 🔄 Now refresh your browser to see the packages
echo 💻 Environment: %COMPUTERNAME%
echo 👤 User: %USERNAME%
pause
