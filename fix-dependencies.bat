@echo off
echo.
echo 🎯 SWANSTUDIOS DEPENDENCY FIX
echo =============================
echo.
echo ✅ ROOT CAUSE IDENTIFIED: Missing critical dependencies
echo 🔧 SOLUTION: Install all required packages
echo.

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"

echo 📦 STEP 1: Installing Frontend Dependencies
echo ==========================================
cd frontend

echo.
echo 🔧 Installing React/Redux packages...
npm install react-redux @reduxjs/toolkit

echo.
echo 🔧 Installing Material-UI packages...
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled

echo.
echo 🔧 Installing Animation packages...  
npm install framer-motion

echo.
echo 🔧 Installing Icon packages...
npm install lucide-react

echo.
echo 🔧 Installing Additional React packages...
npm install @tanstack/react-query react-helmet-async styled-components

echo.
echo 🔧 Installing Utility packages...
npm install axios date-fns

echo.
echo 📦 STEP 2: Installing Backend Dependencies
echo ==========================================
cd ..\backend

echo.
echo 🔧 Installing backend packages...
npm install

echo.
echo 📦 STEP 3: Verification
echo =======================
cd ..\frontend

echo.
echo ✅ Frontend package.json verification:
npm list react-redux @reduxjs/toolkit @mui/material framer-motion lucide-react 2>nul || echo "⚠️  Some packages may need verification"

echo.
echo 🚀 STEP 4: Test Application
echo ============================
echo.
echo 📝 Restoring original main.jsx...
if exist "src\main-backup.jsx" (
    copy "src\main-backup.jsx" "src\main.jsx" >nul
    echo ✅ Original main.jsx restored
) else (
    echo ⚠️  No backup found, main.jsx unchanged
)

echo.
echo 🎯 READY TO TEST:
echo ================
echo.
echo 1. All missing dependencies should now be installed
echo 2. Your SwanStudios app should load properly
echo 3. No more blank page issues
echo.
echo 🚀 Starting development server...
npm run dev

