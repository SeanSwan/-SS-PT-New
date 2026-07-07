@echo off
title Hermes Command Center
setlocal
set "RR=%USERPROFILE%\.hermes\runner-repo"

where node >nul 2>nul
if errorlevel 1 (
  echo [!] node is not on PATH - install Node or fix PATH, then double-click again.
  pause & exit /b 1
)

if not exist "%RR%\scripts\hermes\status-page.mjs" (
  echo ============================================================
  echo  FIRST RUN - activating the Hermes Agentic OS...
  echo  (key + vault + pinned runtime + 6am task; ~30 seconds)
  echo ============================================================
  powershell -NoProfile -ExecutionPolicy Bypass -File "c:\tmp\hermes-os-activate.ps1"
  if not exist "%RR%\scripts\hermes\status-page.mjs" (
    echo [!] Activation did not complete - see c:\tmp\hermes-os-activate.out.txt
    pause & exit /b 1
  )
)

echo Refreshing the command center from live stores...
node "%RR%\scripts\hermes\hermes-doctor.mjs"
node "%RR%\scripts\hermes\health-sweep.mjs"
node "%RR%\scripts\hermes\receipt-digest.mjs"
node "%RR%\scripts\hermes\morning-briefing.mjs"

for /f "delims=" %%p in ('node "%RR%\scripts\hermes\status-page.mjs"') do set "PAGE=%%p"
if not defined PAGE (
  echo [!] status page did not render - scroll up for the failing check.
  pause & exit /b 1
)
start "" "%PAGE%"
echo.
echo Command center opened in your browser. Receipts, digest and briefing live in
echo %USERPROFILE%\.hermes\vault\runs\  - this window can be closed.
pause
