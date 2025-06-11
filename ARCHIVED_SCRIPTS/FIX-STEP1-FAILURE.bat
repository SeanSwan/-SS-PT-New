@echo off
echo 🔬 STEP 1 FAILURE DIAGNOSTIC & FIX
echo ==================================
echo.
echo The original Step 1 failed with:
echo   - undefined table names from information_schema query
echo   - Cannot read properties of undefined (reading 'toLowerCase')
echo.
echo This will:
echo   1. Diagnose exactly what's wrong with the database query
echo   2. Apply a robust fix for the Users table case-sensitivity
echo   3. Verify the fix works
echo.

pause

echo.
echo 🔬 PHASE 1: Comprehensive database diagnostic...
echo ===============================================
echo This will show us exactly what the database queries return
echo.
node comprehensive-database-diagnostic.mjs

echo.
echo.
echo 🔧 PHASE 2: Robust Users table fix...
echo ====================================
echo This will handle all the query result format issues
echo.
node robust-users-table-fix.mjs

echo.
echo.
echo ✅ PHASE 3: Verification...
echo ==========================
echo Checking if the fix resolved the Users table issue
echo.

node -e "
import('./backend/database.mjs').then(async (db) => {
  try {
    await db.default.authenticate();
    console.log('✅ Database connected');
    
    const { QueryTypes } = await import('sequelize');
    const result = await db.default.query('SELECT COUNT(*) as count FROM \"Users\"', { type: QueryTypes.SELECT });
    console.log('✅ \"Users\" table accessible - count:', result[0].count);
    console.log('🎉 SUCCESS: Users table case-sensitivity FIXED!');
    
    await db.default.close();
  } catch (error) {
    console.log('❌ Still broken:', error.message);
    await db.default.close();
  }
});
"

echo.
echo 🎯 RESULTS:
echo ===========
echo If you see "SUCCESS: Users table case-sensitivity FIXED!" above,
echo then you can proceed to restart your backend server.
echo.
echo The original "relation Users does not exist" error should be resolved.
echo.

pause
