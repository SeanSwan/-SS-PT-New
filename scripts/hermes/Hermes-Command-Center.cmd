@echo off
title Hermes Command Center
setlocal
set "RR=%USERPROFILE%\.hermes\runner-repo"

where node >nul 2>nul
if errorlevel 1 (
  echo [!] node is not on PATH - install Node or fix PATH, then double-click again.
  pause & exit /b 1
)

rem Surface runtime truth: compare the pinned checkout with the remote main ref.
rem A local origin/main ref can be stale, so never use it as release truth.
set "PINNED_HEAD="
set "REMOTE_HEAD="
for /f "delims=" %%h in ('git -C "%RR%" rev-parse HEAD 2^>nul') do set "PINNED_HEAD=%%h"
for /f "tokens=1" %%h in ('git -C "%RR%" ls-remote origin refs/heads/main 2^>nul') do set "REMOTE_HEAD=%%h"
if not defined REMOTE_HEAD (
  echo [!] RUNTIME VERSION UNKNOWN - GitHub main could not be checked. Rendering the pinned code.
)
if defined PINNED_HEAD if defined REMOTE_HEAD if /i not "%PINNED_HEAD%"=="%REMOTE_HEAD%" (
  echo [!] RUNTIME DRIFT - pinned Hermes checkout differs from remote main.
  echo     The page will render with the pinned code; refresh runner-repo before release verification.
)
rem Activated = the 6am task exists (not just the runtime folder - a half-finished
rem activation must resume, caught live 2026-07-07).
schtasks /Query /TN "HermesOS-Daily" >nul 2>nul
if errorlevel 1 (
  echo ============================================================
  echo  ACTIVATION - setting up the Hermes Agentic OS...
  echo  (key + vault + pinned runtime + 6am task; ~30 seconds)
  echo ============================================================
  powershell -NoProfile -ExecutionPolicy Bypass -File "c:\tmp\hermes-os-activate.ps1"
  schtasks /Query /TN "HermesOS-Daily" >nul 2>nul
  if errorlevel 1 (
    echo [!] Activation did not complete - see c:\tmp\hermes-os-activate.out.txt
    pause & exit /b 1
  )
)

echo Refreshing the command center from live stores...
node "%RR%\scripts\hermes\hermes-doctor.mjs"
node "%RR%\scripts\hermes\health-sweep.mjs"
node "%RR%\scripts\hermes\receipt-digest.mjs"
node "%RR%\scripts\hermes\morning-briefing.mjs"

node "%RR%\scripts\hermes\status-page.mjs" >nul
for /f "delims=" %%p in ('node "%RR%\scripts\hermes\brain-view.mjs"') do set "PAGE=%%p"
if not defined PAGE (
  echo [!] brain view did not render - scroll up for the failing check.
  pause & exit /b 1
)
start "" "%PAGE%"
echo.
echo Command center opened in your browser. Receipts, digest and briefing live in
echo %USERPROFILE%\.hermes\vault\runs\  - this window can be closed.
pause
