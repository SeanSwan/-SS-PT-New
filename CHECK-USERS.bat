@echo off
echo ==========================================
echo CHECK EXISTING USERS
echo ==========================================
echo.
echo This will show you what usernames/emails
echo are already taken so you can pick different ones.
echo.

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"
node check-existing-users.mjs

echo.
pause
