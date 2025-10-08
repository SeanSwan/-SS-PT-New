@echo off
echo 🚀 SWAN STUDIOS - THE GREAT MUI-ECTOMY VERIFICATION
echo ================================================

echo.
echo 🧹 Step 1: Cleaning node_modules and package-lock.json...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo 📦 Step 2: Fresh npm install...
npm install

echo.
echo 🔨 Step 3: Production build test...
npm run build

echo.
echo ✅ Step 4: Build verification complete!
echo If no errors appeared above, the MUI-ectomy was SUCCESSFUL!

pause