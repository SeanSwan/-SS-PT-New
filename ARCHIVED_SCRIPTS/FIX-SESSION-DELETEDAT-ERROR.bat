@echo off
echo ================================================
echo 🔧 SESSION DELETEDAT COLUMN ERROR - PERMANENT FIX
echo ================================================
echo.

echo 🎯 PROBLEM IDENTIFIED:
echo   - Session model has "paranoid: true" 
echo   - Sessions table lacks "deletedAt" column
echo   - Every query fails with "column Session.deletedAt does not exist"
echo.

echo 🔧 SOLUTION OPTIONS:
echo.
echo [OPTION A] Add missing deletedAt column (keeps soft delete functionality)
echo [OPTION B] Remove paranoid mode from Session model (disables soft deletes)
echo.

set /p choice="Which solution do you prefer? (A/B): "

if /i "%choice%"=="A" (
    echo.
    echo 🚀 OPTION A: Adding missing deletedAt column to sessions table...
    echo ================================================
    echo.
    
    cd backend
    
    echo [INFO] Running migration to add deletedAt column...
    node fix-session-deletedat-production.mjs
    
    if %errorlevel% equ 0 (
        echo.
        echo [SUCCESS] 🎉 OPTION A COMPLETED!
        echo ✅ deletedAt column added to sessions table
        echo ✅ Session model can now use paranoid mode
        echo ✅ Soft delete functionality preserved
        echo.
    ) else (
        echo.
        echo [ERROR] ❌ OPTION A FAILED!
        echo Please check the error messages above.
    )
    
) else if /i "%choice%"=="B" (
    echo.
    echo 🚀 OPTION B: Removing paranoid mode from Session model...
    echo ================================================
    echo.
    
    echo [INFO] Backing up current Session model...
    copy "backend\models\Session.mjs" "backend\models\Session.mjs.backup"
    
    echo [INFO] Applying fixed Session model without paranoid mode...
    copy "Session-FIXED-No-Paranoid.mjs" "backend\models\Session.mjs"
    
    if %errorlevel% equ 0 (
        echo.
        echo [SUCCESS] 🎉 OPTION B COMPLETED!
        echo ✅ Session model updated (paranoid: false)
        echo ✅ No deletedAt column required
        echo ✅ Session queries will now work
        echo.
        echo [INFO] 📋 Changes made:
        echo   - Backup created: Session.mjs.backup
        echo   - Updated: paranoid: true → paranoid: false
        echo.
        echo [WARNING] ⚠️  Soft delete functionality disabled
        echo   - Sessions will be permanently deleted (not soft deleted)
        echo   - This is usually fine for session data
        echo.
    ) else (
        echo [ERROR] ❌ OPTION B FAILED!
        echo Could not update Session model file.
    )
    
) else (
    echo.
    echo [ERROR] Invalid choice. Please run the script again and choose A or B.
    pause
    exit /b 1
)

echo ================================================
echo 🧪 TESTING THE FIX
echo ================================================
echo.

echo [INFO] Testing Session model query...
cd backend
node -e "import('./models/Session.mjs').then(Session => Session.default.findAll({limit: 1}).then(() => console.log('✅ Session query test PASSED')).catch(e => console.error('❌ Session query test FAILED:', e.message)))"

echo.
echo ================================================
echo 📋 NEXT STEPS
echo ================================================
echo.
echo 1. Restart your application server
echo 2. Test the problematic API endpoints:
echo    - /api/schedule
echo    - /api/mcp/analyze
echo 3. Verify no more "deletedAt column" errors
echo.

if /i "%choice%"=="A" (
    echo [OPTION A] If successful:
    echo   ✅ Your Session model now supports soft deletes
    echo   ✅ Deleted sessions are marked with deletedAt timestamp
    echo   ✅ All existing functionality preserved
) else if /i "%choice%"=="B" (
    echo [OPTION B] If successful:
    echo   ✅ Your Session model uses hard deletes
    echo   ✅ No deletedAt column required
    echo   ✅ Simpler database structure
)

echo.
echo 🎊 SESSION DELETEDAT COLUMN ERROR SHOULD NOW BE FIXED!
echo.
pause
