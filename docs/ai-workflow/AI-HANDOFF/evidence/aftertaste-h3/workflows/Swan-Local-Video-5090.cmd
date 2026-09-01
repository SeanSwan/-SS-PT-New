@echo off
setlocal
title Swan Local Video - RTX 5090 - H3 Candidate

REM ============================================================================
REM  Swan Local Video (5090) - upgraded H3 candidate double-click launcher
REM ============================================================================
REM  Starts the isolated, verified ComfyUI/H3 candidate and opens its browser.
REM  The original rollback launcher is preserved beside this file as:
REM    Swan Local Video 5090.rollback-20260831.cmd
REM
REM  Candidate runtime is REPORTED at startup from /system_stats, not hard-coded here.
REM  Port: 8189 (the frozen rollback remains on 8188)
REM  Models: read from Z:\AI-Weights\ComfyUI; candidate state stays isolated on C:
REM ============================================================================

set "CANDIDATE_ROOT=C:\ComfyUI-H3-v0.34.2-cu130"
set "URL=http://127.0.0.1:8189"
set "CANDIDATE_SCRIPT=%CANDIDATE_ROOT%\Start-H3-Candidate.ps1"
set "WORKFLOW_DIR=%CANDIDATE_ROOT%\user-candidate\default\workflows"
set "I2V_WORKFLOW=%WORKFLOW_DIR%\01 SWAN - H3 local - First + Last Frame.json"

echo.
echo   ==================================================
echo      SWAN LOCAL VIDEO  -  RTX 5090  -  H3 CANDIDATE
echo   ==================================================
echo.

REM --- Already running? Do NOT start a second candidate instance. ------------
curl -s -m 3 -o nul "%URL%/system_stats" 2>nul
if %errorlevel%==0 (
    echo   Candidate already running - opening the browser.
    echo.
    start "" "%URL%"
    timeout /t 3 /nobreak >nul
    exit /b 0
)

if not exist "%CANDIDATE_ROOT%\main.py" (
    echo   [X] H3 candidate not found at %CANDIDATE_ROOT%
    echo.
    pause
    exit /b 1
)
if not exist "%CANDIDATE_ROOT%\.venv\Scripts\python.exe" (
    echo   [X] Candidate Python environment is missing.
    echo       Expected: %CANDIDATE_ROOT%\.venv\Scripts\python.exe
    echo.
    pause
    exit /b 1
)
if not exist "%CANDIDATE_SCRIPT%" (
    echo   [X] Candidate launcher is missing: %CANDIDATE_SCRIPT%
    echo.
    pause
    exit /b 1
)
if not exist "%I2V_WORKFLOW%" (
    echo   [X] The H3 first/last-frame workflow is missing.
    echo       Expected: %I2V_WORKFLOW%
    echo.
    pause
    exit /b 1
)
if not exist "Z:\" (
    echo   [X] Z: drive not available. Shared H3 weights cannot be read.
    echo       This stops rather than silently switching to another model path.
    echo.
    pause
    exit /b 1
)

echo   GPU:
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>nul
if %errorlevel% neq 0 echo     [!] nvidia-smi unavailable - starting anyway.
echo.
if exist "Z:\SwanStudios-Video\" (
  echo   Render output:    Z:\SwanStudios-Video\output   [one library, on the big disk]
) else (
  echo   Render output:    %CANDIDATE_ROOT%\output-candidate   [Z: not mounted - using the local fallback]
)
echo   Saved workflows: %WORKFLOW_DIR%
echo   Starting on %URL% ...
echo.

start "ComfyUI H3 Candidate (8189)" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CANDIDATE_SCRIPT%"

REM --- Wait for a real API answer instead of assuming the process started. ---
set /a tries=0
:WAITLOOP
timeout /t 3 /nobreak >nul
curl -s -m 3 -o nul "%URL%/system_stats" 2>nul
if %errorlevel%==0 goto READY
set /a tries+=1
if %tries% lss 60 (
    echo     ...still starting ^(%tries%^)
    goto WAITLOOP
)

echo.
echo   [X] H3 candidate did not answer after approximately 3 minutes.
echo       Inspect the minimized candidate PowerShell window for the error.
echo.
pause
exit /b 1

:READY
echo.
echo   ==================================================
echo      READY  -  opening %URL%
echo   ==================================================
echo.
REM  Ask the running server what it actually is. This line used to print a hard-coded
REM  "Verified candidate: ComfyUI 0.34.2 / Python 3.13.15 / Torch CUDA 13" after nothing more
REM  than an HTTP 200, so it kept claiming those versions after any upgrade or venv change.
REM  A hostile review caught it. Reported, not asserted:
for /f "delims=" %%V in ('powershell -NoProfile -Command "try{$s=(Invoke-RestMethod -Uri '%URL%/system_stats' -TimeoutSec 8).system; 'ComfyUI ' + $s.comfyui_version + ' / Python ' + ($s.python_version -split ' ')[0] + ' / Torch ' + $s.pytorch_version}catch{'could not read /system_stats'}"') do set "RUNTIME=%%V"
echo   Running now: %RUNTIME%
echo.
echo   Workflows (left rail, Workflows panel - both open free, VRAM
echo   is only used when you press Run; switching auto-swaps models):
echo     01 SWAN - H3 local - First + Last Frame   [videos]
echo     04 SWAN - Krea2 - Character Stills        [pictures / avatar]
echo   Videos: replace START and END images, then Run.
echo   Stills: edit the prompt, Run - they are sized to feed 01.
echo.
start "" "%URL%"

echo   The candidate server runs in a separate minimized PowerShell window.
echo   Close THAT window to stop it. This launcher can be closed now.
echo.
pause
endlocal
