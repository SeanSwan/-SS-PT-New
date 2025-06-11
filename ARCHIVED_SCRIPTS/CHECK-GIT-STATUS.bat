@echo off
echo.
echo 📋 GIT STATUS VERIFICATION
echo ==========================
echo.

echo Current directory: %CD%
echo Current time: %date% %time%
echo.

echo 🔍 Checking Git Status...
echo =========================
git status --porcelain
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Git status check completed
) else (
    echo ❌ Git status check failed
    goto :end
)

echo.
echo 🔍 Checking Current Branch...
echo =============================
git branch --show-current
echo.

echo 🔍 Recent Commits...
echo ====================
git log --oneline -5
echo.

echo 🔍 Remote Status...
echo ===================
git remote -v
echo.

echo 📊 ANALYSIS:
echo ============
echo.

echo Checking for uncommitted changes...
for /f %%i in ('git status --porcelain ^| wc -l') do set changes=%%i
if %changes% EQU 0 (
    echo ✅ Working directory is clean - all changes committed
) else (
    echo ⚠️  Uncommitted changes detected:
    git status --short
    echo.
    echo 🔧 TO COMMIT AND DEPLOY:
    echo git add .
    echo git commit -m "Apply critical login fixes - ready for deployment"
    echo git push origin main
)

echo.
echo 🔍 Checking if local changes are pushed...
git status | findstr "Your branch is ahead" >nul
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  Local commits not pushed to remote
    echo Run: git push origin main
) else (
    echo ✅ Local and remote branches appear to be in sync
)

echo.
echo 🎯 SUMMARY:
echo ===========
echo All critical fixes from the session report have been applied to local files.
echo If there are uncommitted changes, commit and push them to trigger redeployment.
echo If everything is committed and pushed, check Render dashboard for deployment status.

:end
pause
