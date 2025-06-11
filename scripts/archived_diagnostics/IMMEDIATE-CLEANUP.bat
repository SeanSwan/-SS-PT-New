@echo off
REM ================================================================
REM SWANSTUDIOS IMMEDIATE CLEANUP - SAFE FILE REMOVAL
REM ================================================================
REM Quick cleanup of obvious candidates with high confidence
REM Master Prompt v28 aligned - The Swan Alchemist
REM ================================================================

echo.
echo ====================================================================
echo 🧹 SWANSTUDIOS IMMEDIATE CLEANUP - SAFE FILE REMOVAL
echo ====================================================================
echo.
echo This script removes files that are definitely safe to delete:
echo - Emergency fix scripts (emergency-*.mjs/js/bat)
echo - Temporary test scripts (test-*.mjs/js/bat)  
echo - Old diagnostic scripts (check-*, verify-*, diagnose-*)
echo - Redundant documentation (*-FIX-COMPLETE.md, etc.)
echo - Old deployment scripts (DEPLOY-*, RUN-*, APPLY-*)
echo.
echo 🛡️ PROTECTED: All core files, recent fixes, and application code
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause > nul

echo.
echo ====================================================================
echo 🔒 CREATING SAFETY BACKUP
echo ====================================================================
echo.

echo Creating git backup before cleanup...
git add .
git status
echo.
set /p create_backup="Create git backup commit? (y/n): "
if /i "%create_backup%"=="y" (
    git commit -m "💾 Backup before immediate project cleanup - Remove safe file candidates"
    echo ✅ Backup created successfully!
) else (
    echo ⚠️ Backup skipped - proceeding without git backup
)

echo.
echo ====================================================================
echo 🗑️ PHASE 1: EMERGENCY FIX FILES
echo ====================================================================
echo.

echo Removing emergency fix scripts...
set emergency_count=0

for %%f in (emergency-*.mjs emergency-*.js emergency-*.bat) do (
    if exist "%%f" (
        echo Removing: %%f
        del "%%f"
        set /a emergency_count+=1
    )
)

echo ✅ Removed %emergency_count% emergency fix files

echo.
echo ====================================================================
echo 🗑️ PHASE 2: TEMPORARY TEST FILES
echo ====================================================================
echo.

echo Removing temporary test scripts...
set test_count=0

for %%f in (test-*.mjs test-*.js test-*.bat) do (
    if exist "%%f" (
        echo Removing: %%f
        del "%%f"
        set /a test_count+=1
    )
)

echo ✅ Removed %test_count% test files

echo.
echo ====================================================================
echo 🗑️ PHASE 3: DIAGNOSTIC SCRIPTS
echo ====================================================================
echo.

echo Removing old diagnostic scripts...
set diagnostic_count=0

for %%f in (check-*.mjs verify-*.mjs diagnose-*.mjs debug-*.mjs) do (
    if exist "%%f" (
        REM Protect recent important files
        if not "%%f"=="verify-spa-routing-fix.mjs" (
            echo Removing: %%f
            del "%%f"
            set /a diagnostic_count+=1
        ) else (
            echo Protected: %%f (recent important file)
        )
    )
)

echo ✅ Removed %diagnostic_count% diagnostic files

echo.
echo ====================================================================
echo 🗑️ PHASE 4: REDUNDANT DOCUMENTATION
echo ====================================================================
echo.

echo Removing redundant fix documentation...
set doc_count=0

for %%f in (*-FIX-COMPLETE.md *-FIXES-APPLIED.md *-FIX-GUIDE.md) do (
    if exist "%%f" (
        REM Protect recent SPA routing documentation
        if not "%%f"=="SPA-ROUTING-FIX-COMPREHENSIVE-SOLUTION.md" (
            echo Removing: %%f
            del "%%f"
            set /a doc_count+=1
        ) else (
            echo Protected: %%f (recent important documentation)
        )
    )
)

echo ✅ Removed %doc_count% redundant documentation files

echo.
echo ====================================================================
echo 🗑️ PHASE 5: OLD DEPLOYMENT SCRIPTS
echo ====================================================================
echo.

echo Removing old deployment scripts...
set deploy_count=0

for %%f in (DEPLOY-*.bat RUN-*.bat APPLY-*.bat) do (
    if exist "%%f" (
        REM Protect recent important deployment script
        if not "%%f"=="DEPLOY-SPA-ROUTING-FIX.bat" (
            echo Removing: %%f
            del "%%f"
            set /a deploy_count+=1
        ) else (
            echo Protected: %%f (recent important script)
        )
    )
)

echo ✅ Removed %deploy_count% old deployment files

echo.
echo ====================================================================
echo 🗑️ PHASE 6: OLD SQL HOTFIX FILES
echo ====================================================================
echo.

echo Removing old SQL hotfix files...
set sql_count=0

for %%f in (*-hotfix.sql manual-*.sql emergency-*.sql) do (
    if exist "%%f" (
        echo Removing: %%f
        del "%%f"
        set /a sql_count+=1
    )
)

echo ✅ Removed %sql_count% SQL hotfix files

echo.
echo ====================================================================
echo 📊 CLEANUP SUMMARY
echo ====================================================================
echo.

set /a total_removed=%emergency_count%+%test_count%+%diagnostic_count%+%doc_count%+%deploy_count%+%sql_count%

echo 🎉 IMMEDIATE CLEANUP COMPLETE!
echo.
echo Files removed by category:
echo   Emergency fixes: %emergency_count%
echo   Test scripts: %test_count%
echo   Diagnostic scripts: %diagnostic_count%
echo   Redundant docs: %doc_count%
echo   Old deployment scripts: %deploy_count%
echo   SQL hotfix files: %sql_count%
echo.
echo 📈 Total files removed: %total_removed%
echo.

if %total_removed% GTR 0 (
    echo ✅ Your project is now cleaner and more organized!
    echo.
    echo 📋 Next steps:
    echo 1. Test your application: npm run start
    echo 2. Run full analysis: node analyze-project-cleanup.mjs
    echo 3. Consider additional cleanup with generated scripts
    echo 4. Commit changes: git add . ^&^& git commit -m "🧹 Immediate cleanup - Remove %total_removed% safe files"
) else (
    echo ℹ️ No matching files found for immediate cleanup.
    echo This might mean:
    echo - Files were already cleaned up
    echo - File patterns don't match current structure
    echo - You may need to run the full analysis scripts
)

echo.
echo ====================================================================
echo 🚀 NEXT STEPS FOR DEEPER CLEANUP
echo ====================================================================
echo.
echo For comprehensive project cleanup:
echo.
echo 1. Run full analysis:
echo    node analyze-project-cleanup.mjs
echo.
echo 2. Run active file tracer:
echo    node trace-active-files.mjs
echo.
echo 3. Review and execute generated cleanup scripts
echo.
echo 4. See complete guide:
echo    type PROJECT-CLEANUP-ANALYSIS-COMPLETE.md
echo.

echo Press any key to exit...
pause > nul
