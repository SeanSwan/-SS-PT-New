@echo off
echo ==========================================
echo SHOW ALL USERS IN DATABASE
echo ==========================================
echo.
echo This will show you everyone who has registered,
echo so you can see if your email/username already exists.
echo.
echo If you see your info, try LOGGING IN instead!
echo.

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"
node show-all-users.mjs

echo.
echo ==========================================
echo WHAT TO DO NEXT:
echo ==========================================
echo.
echo If you found your email/username above:
echo   1. Try LOGGING IN instead of registering
echo   2. Use password reset if you forgot password
echo   3. Or register with different email/username
echo.
echo If you did NOT find your info:
echo   Something else is causing the conflict.
echo   Try registering again with your info.
echo.
pause
