@echo off
setlocal
title Swan Trim Clip - drag a video onto this icon

REM ============================================================================
REM  Swan Trim Clip - drag-and-drop front door for workflow 06 (Video to
REM  Character). Drag ANY video onto this icon, type the start and end times,
REM  and the trimmed clip lands in ComfyUI's video dropdown automatically.
REM  Engine: C:\ComfyUI-H3-v0.34.2-cu130\Trim-Clip.ps1
REM ============================================================================

if "%~1"=="" (
    echo.
    echo   Drag a video file ONTO this icon to trim it.
    echo   Or run:  "Swan Trim Clip.cmd" "C:\path\video.mp4"
    echo.
    pause
    exit /b 1
)

echo.
echo   ==================================================
echo      SWAN TRIM CLIP
echo   ==================================================
echo.
echo   Video: %~nx1
echo.
set /p FROMT="  Start time (like 7:00 or 95): "
set /p TOT="  End time   (like 7:20 or 115): "
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "C:\ComfyUI-H3-v0.34.2-cu130\Trim-Clip.ps1" -In "%~1" -From "%FROMT%" -To "%TOT%"
if %errorlevel% neq 0 (
    echo.
    echo   [X] Trim failed - check the times and try again.
)
echo.
pause
endlocal
