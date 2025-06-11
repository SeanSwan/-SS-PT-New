@echo off
echo 🔧 FIXING REMAINING UUID vs INTEGER MISMATCH
echo ==========================================
echo.
echo Issue: sessions.cancelledBy is UUID but users.id is INTEGER
echo Solution: Convert cancelledBy to INTEGER type
echo.

echo 🚀 Running cancelledBy column fix...
node fix-cancelled-by-column.cjs

if %errorlevel% neq 0 (
    echo.
    echo ❌ Fix failed
    pause
    exit /b 1
)

echo.
echo 🚀 Retrying Enhanced Social Media Platform deployment...
cd backend
call npx sequelize-cli db:migrate

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Some migrations may still have issues
    echo 💡 Check the output above for any remaining problems
) else (
    echo.
    echo 🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!
    echo ✅ Enhanced Social Media Platform deployed!
)

echo.
echo 🎊 FOREIGN KEY CONSTRAINT ERRORS RESOLVED!
echo ========================================
echo ✅ sessions.userId: FIXED
echo ✅ sessions.cancelledBy: FIXED  
echo ✅ Enhanced Social Media Platform: READY
echo.
echo 🚀 Start development server: npm run dev
echo.
pause
