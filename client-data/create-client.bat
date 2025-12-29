@echo off
REM Quick script to create a new client folder (Windows version)
REM Usage: create-client.bat "JOHN-DOE"

if "%~1"=="" (
  echo ❌ Error: Please provide a client name
  echo Usage: create-client.bat "JOHN-DOE"
  echo Example: create-client.bat "SARAH-MITCHELL"
  exit /b 1
)

set CLIENT_NAME=%~1
set CLIENT_DIR=%~dp0%CLIENT_NAME%

REM Check if client folder already exists
if exist "%CLIENT_DIR%" (
  echo ❌ Error: Client folder '%CLIENT_NAME%' already exists!
  exit /b 1
)

echo Creating new client: %CLIENT_NAME%
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REM Copy template folder
echo 📁 Copying template folder...
xcopy /E /I "%~dp0TEMPLATE-CLIENT" "%CLIENT_DIR%" >nul

REM Rename Master Prompt file
echo 📝 Creating Master Prompt file...
move "%CLIENT_DIR%\MASTER-PROMPT-TEMPLATE.json" "%CLIENT_DIR%\%CLIENT_NAME%-MASTER-PROMPT-v1.0.json" >nul

REM Create consent folder
echo 🔒 Setting up consent folder...
mkdir "%CLIENT_DIR%\consent" 2>nul

REM Create consent summary
echo # Consent Summary: %CLIENT_NAME% > "%CLIENT_DIR%\consent\consent-summary.md"
echo **Last Updated:** %date% >> "%CLIENT_DIR%\consent\consent-summary.md"
echo. >> "%CLIENT_DIR%\consent\consent-summary.md"
echo ## Active Consents >> "%CLIENT_DIR%\consent\consent-summary.md"
echo - [ ] General Training Services (signed: YYYY-MM-DD) >> "%CLIENT_DIR%\consent\consent-summary.md"
echo - [ ] Medical Information Collection (signed: YYYY-MM-DD) >> "%CLIENT_DIR%\consent\consent-summary.md"
echo - [ ] Progress Photos - Personal Use Only (signed: YYYY-MM-DD) >> "%CLIENT_DIR%\consent\consent-summary.md"
echo - [ ] Marketing Use of Photos (signed: YYYY-MM-DD) >> "%CLIENT_DIR%\consent\consent-summary.md"
echo - [ ] AI Coaching (signed: YYYY-MM-DD) >> "%CLIENT_DIR%\consent\consent-summary.md"

REM Create notes folder
echo 📋 Creating notes folder...
mkdir "%CLIENT_DIR%\notes" 2>nul

echo # Private Trainer Notes: %CLIENT_NAME% > "%CLIENT_DIR%\notes\private-notes.md"
echo **Last Updated:** %date% >> "%CLIENT_DIR%\notes\private-notes.md"
echo. >> "%CLIENT_DIR%\notes\private-notes.md"
echo ## First Impressions >> "%CLIENT_DIR%\notes\private-notes.md"
echo [Add initial observations about client] >> "%CLIENT_DIR%\notes\private-notes.md"

REM Create README
echo 📖 Creating client folder README...
echo # %CLIENT_NAME% - Client Folder > "%CLIENT_DIR%\README.md"
echo. >> "%CLIENT_DIR%\README.md"
echo **Created:** %date% >> "%CLIENT_DIR%\README.md"
echo **Status:** Active >> "%CLIENT_DIR%\README.md"
echo. >> "%CLIENT_DIR%\README.md"
echo ## Primary Goal >> "%CLIENT_DIR%\README.md"
echo [Weight loss / Muscle gain / Strength / etc.] >> "%CLIENT_DIR%\README.md"

echo.
echo ✅ SUCCESS! Client folder created: %CLIENT_DIR%
echo.
echo Next steps:
echo   1. Edit: %CLIENT_NAME%-MASTER-PROMPT-v1.0.json (fill in client data)
echo   2. Update: consent\consent-summary.md (after getting signed forms)
echo   3. Create first workout log in workouts\ folder
echo   4. Add to registry: CLIENT-REGISTRY.md
echo.
echo 📁 Client folder location:
echo   %CLIENT_DIR%
echo.
echo 🎉 Ready to train %CLIENT_NAME%!

pause
