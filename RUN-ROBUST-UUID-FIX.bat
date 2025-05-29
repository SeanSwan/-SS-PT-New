@echo off
echo ==========================================
echo  🔧 ROBUST UUID CONVERSION FIX 🔧
echo ==========================================
echo.
echo The previous targeted fix failed due to column count mismatch.
echo This robust fix handles the data structure more dynamically.
echo.
echo What this robust fix does:
echo ✅ Analyzes existing user data structure  
echo ✅ Handles column mismatches gracefully
echo ✅ Converts users.id from UUID to INTEGER safely
echo ✅ Preserves all existing user data
echo ✅ Adds missing session table columns
echo ✅ Verifies conversion success
echo.
echo ⚠️ Make sure your PostgreSQL database is running!
echo.
pause

echo.
echo 🔧 Running robust UUID conversion fix...
echo.
node robust-uuid-fix.mjs
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==========================================
    echo  🎉 ROBUST UUID FIX SUCCESSFUL! 🎉
    echo ==========================================
    echo.
    echo ✅ Users.id converted from UUID to INTEGER
    echo ✅ All user data preserved  
    echo ✅ Foreign key compatibility restored
    echo ✅ Session table columns added
    echo ✅ Database schema aligned with models
    echo.
    echo 🚀 Next steps:
    echo 1. Test your local SwanStudios platform
    echo 2. Deploy to production: git add . && git commit -m "Robust UUID fix" && git push
    echo.
    echo The following errors should now be resolved:
    echo ✅ "column Session.reason does not exist"
    echo ✅ UUID vs INTEGER foreign key mismatches  
    echo ✅ Schedule and session functionality
    echo ✅ Platform should be fully operational
    echo.
    echo 🦢 Your SwanStudios platform is now ready!
    echo.
) else (
    echo.
    echo ==========================================
    echo  ❌ ROBUST UUID FIX FAILED ❌
    echo ==========================================
    echo.
    echo Please check the error messages above.
    echo.
    echo If this robust fix also fails, we may need to:
    echo 1. Manually inspect the users table structure
    echo 2. Create a completely custom migration script
    echo 3. Consider starting with a clean database
    echo.
    echo Contact support with the error details above.
    echo.
)

echo Press any key to continue...
pause