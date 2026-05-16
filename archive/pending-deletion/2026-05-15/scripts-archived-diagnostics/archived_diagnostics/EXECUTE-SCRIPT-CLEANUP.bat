@echo off
echo 🧹 STARTING MASSIVE SCRIPT CLEANUP...
echo.

:: Create archive directory if it doesn't exist
if not exist "ARCHIVED_SCRIPTS" mkdir "ARCHIVED_SCRIPTS"

:: Move all the clutter files (keeping only essential ones)
echo Moving FIX-* scripts...
for %%f in (FIX-*.bat FIX-*.mjs fix-*.bat fix-*.mjs fix-*.sh fix-*.js fix-*.cjs) do (
    if exist "%%f" (
        if not "%%f"=="fix-build-commands.sh" (
            move "%%f" "ARCHIVED_SCRIPTS\"
        )
    )
)

echo Moving TEST-* scripts...
for %%f in (TEST-*.bat TEST-*.mjs test-*.bat test-*.mjs test-*.sh test-*.js test-*.cjs) do (
    if exist "%%f" move "%%f" "ARCHIVED_SCRIPTS\"
)

echo Moving CHECK-* scripts...
for %%f in (CHECK-*.bat CHECK-*.mjs check-*.bat check-*.mjs check-*.sh check-*.js check-*.cjs) do (
    if exist "%%f" (
        if not "%%f"=="CHECK-STATUS.bat" (
            move "%%f" "ARCHIVED_SCRIPTS\"
        )
    )
)

echo Moving DEPLOY-* scripts...
for %%f in (DEPLOY-*.bat DEPLOY-*.mjs deploy-*.bat deploy-*.mjs deploy-*.sh deploy-*.js deploy-*.cjs) do (
    if exist "%%f" (
        if not "%%f"=="DEPLOY-TO-RENDER.bat" (
            move "%%f" "ARCHIVED_SCRIPTS\"
        )
    )
)

echo Moving QUICK-* scripts...
for %%f in (QUICK-*.bat QUICK-*.mjs quick-*.bat quick-*.mjs quick-*.sh quick-*.js quick-*.cjs) do (
    if exist "%%f" (
        if not "%%f"=="QUICK-DEV-START.bat" (
            move "%%f" "ARCHIVED_SCRIPTS\"
        )
    )
)

echo Moving EMERGENCY-* scripts...
for %%f in (EMERGENCY-*.bat EMERGENCY-*.mjs emergency-*.bat emergency-*.mjs emergency-*.sh emergency-*.js emergency-*.cjs EMERGENCY-*.md emergency-*.md) do (
    if exist "%%f" move "%%f" "ARCHIVED_SCRIPTS\"
)

echo Moving CRITICAL-* scripts...
for %%f in (CRITICAL-*.bat CRITICAL-*.mjs critical-*.bat critical-*.mjs critical-*.sh critical-*.js critical-*.cjs CRITICAL-*.md critical-*.md) do (
    if exist "%%f" move "%%f" "ARCHIVED_SCRIPTS\"
)

echo Moving COMPLETE-* scripts...
for %%f in (COMPLETE-*.bat COMPLETE-*.mjs complete-*.bat complete-*.mjs complete-*.sh complete-*.js complete-*.cjs COMPLETE-*.md complete-*.md) do (
    if exist "%%f" move "%%f" "ARCHIVED_SCRIPTS\"
)

echo Moving diagnostic and temporary files...
for %%f in (diagnose-*.mjs analyze-*.mjs verify-*.mjs VERIFY-*.bat validate-*.mjs cleanup-*.mjs troubleshoot-*.cjs inspect-*.mjs trace-*.mjs run-*.mjs render-*.mjs master-*.mjs comprehensive-*.mjs robust-*.mjs targeted-*.mjs) do (
    if exist "%%f" move "%%f" "ARCHIVED_SCRIPTS\"
)

echo Moving documentation files...
for %%f in (*-FIXES*.md *-fixes*.md *-SUMMARY*.md *-summary*.md *-GUIDE*.md *-guide*.md *-DOCUMENTATION*.md *-documentation*.md *-REPORT*.md *-report*.md *-HANDOFF*.md *-handoff*.md *-CHECKLIST*.md *-checklist*.md *-INSTRUCTIONS*.md *-instructions*.md *-STATUS*.md *-status*.md *-ANALYSIS*.md *-analysis*.md *-DIAGNOSTIC*.md *-diagnostic*.md *-EXPLANATION*.md *-explanation*.md *-COMPLETE*.md *-complete*.md *-APPLIED*.md *-applied*.md *-SOLUTION*.md *-solution*.md *-RECOVERY*.md *-recovery*.md *-DEPLOYMENT*.md *-deployment*.md) do (
    if exist "%%f" move "%%f" "ARCHIVED_SCRIPTS\"
)

echo Moving special prefix files...
for %%f in (⚡-*.* 🎯-*.* 🚨-*.* 💡-*.* 🔧-*.* 🎉-*.*) do (
    if exist "%%f" move "%%f" "ARCHIVED_SCRIPTS\"
)

echo Moving log files...
for %%f in (*.log error.log combined.log) do (
    if exist "%%f" move "%%f" "ARCHIVED_SCRIPTS\"
)

echo Moving other clutter files...
for %%f in (browser-*.js STARTUP-FAILURE-PATTERNS.txt WORST-ISSUES.md MISSION-ACCOMPLISHED.md LOGIN-DIAGNOSIS.md ENVIRONMENT-CLEANUP-PLAN.md P0-CRISIS-RESOLUTION-COMPLETE.md README-DIAGNOSTIC-REQUIRED.md ProfileContainer-fix.tsx nginx-spa-config.conf) do (
    if exist "%%f" move "%%f" "ARCHIVED_SCRIPTS\"
)

echo.
echo ✅ SCRIPT CLEANUP COMPLETE!
echo 📁 Clutter files moved to: ARCHIVED_SCRIPTS\
echo 🎯 Essential scripts kept in root directory
echo.
pause
