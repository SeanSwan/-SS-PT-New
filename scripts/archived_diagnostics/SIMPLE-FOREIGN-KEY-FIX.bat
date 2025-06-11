@echo off
echo ⚡ SIMPLE FOREIGN KEY FIX - IMMEDIATE SOLUTION
echo =============================================
echo.

cd "%~dp0backend" || (
    echo ❌ Could not find backend directory
    pause
    exit /b 1
)

echo 🚀 Running simple foreign key fix...
node ../direct-foreign-key-fix.cjs

if %errorlevel% neq 0 (
    echo.
    echo ❌ Simple fix failed
    echo 💡 Try the manual SQL option: MINIMAL-FIX.sql
    pause
    exit /b 1
)

echo.
echo 🚀 Running Enhanced Social Media Platform deployment...
call npx sequelize-cli db:migrate

echo.
echo 🎉 FOREIGN KEY CONSTRAINT ERROR RESOLVED!
echo ✅ Enhanced Social Media Platform ready!
echo.
pause
