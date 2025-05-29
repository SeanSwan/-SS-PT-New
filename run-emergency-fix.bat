@echo off
echo ==========================================
echo  🚨 EMERGENCY DATABASE SCHEMA FIX 🚨
echo ==========================================
echo.
echo This will fix the critical UUID vs INTEGER mismatch
echo that's preventing your SwanStudios platform from working.
echo.
echo What this fix does:
echo ✅ Converts users.id from UUID to INTEGER
echo ✅ Preserves all existing user data  
echo ✅ Fixes foreign key constraints
echo ✅ Adds missing session table columns
echo ✅ Aligns database with model specifications
echo.
echo ⚠️ IMPORTANT: Make sure your database is running!
echo.
pause

echo.
echo 🔧 Running emergency database fix...
echo.

node emergency-database-fix.mjs

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==========================================
    echo  🎉 EMERGENCY FIX SUCCESSFUL! 🎉
    echo ==========================================
    echo.
    echo Your database schema has been fixed!
    echo.
    echo Next steps:
    echo 1. Your local database is now working
    echo 2. Deploy to production: git add . && git commit -m "Emergency database schema fix" && git push
    echo 3. Test your SwanStudios platform
    echo.
    echo The following errors should now be resolved:
    echo ✅ "column Session.reason does not exist"
    echo ✅ UUID vs INTEGER foreign key mismatches
    echo ✅ Schedule and session functionality
    echo.
) else (
    echo.
    echo ==========================================
    echo  ❌ EMERGENCY FIX FAILED ❌
    echo ==========================================
    echo.
    echo Please check the error messages above.
    echo Common issues:
    echo - Database server not running
    echo - Connection settings incorrect
    echo - Insufficient database permissions
    echo.
    echo Contact support if the issue persists.
    echo.
)

echo Press any key to continue...
pause