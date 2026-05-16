@echo off
setlocal

set "TARGET=%USERPROFILE%\Desktop\quick-pt\SS-PT\scripts\swan-video-studio\launch-swan-video-studio.ps1"
if not exist "%TARGET%" set "TARGET=%USERPROFILE%\Desktop\SS-PT\scripts\swan-video-studio\launch-swan-video-studio.ps1"
if not exist "%TARGET%" set "TARGET=%USERPROFILE%\Documents\SS-PT\scripts\swan-video-studio\launch-swan-video-studio.ps1"

if not exist "%TARGET%" (
  echo Could not find launch-swan-video-studio.ps1.
  echo Checked Desktop\quick-pt\SS-PT, Desktop\SS-PT, and Documents\SS-PT.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%TARGET%"
pause
