@echo off
echo Killing existing backend processes...

REM Kill node processes on port 10000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :10000') do (
    echo Killing process %%a on port 10000
    taskkill /F /PID %%a
)

REM Kill any node.js processes that might be running the backend
wmic process where "name='node.exe'" get ProcessId,CommandLine | findstr server.mjs
for /f "tokens=2" %%a in ('wmic process where "name='node.exe'" get ProcessId^,CommandLine ^| findstr server.mjs') do (
    if not "%%a"=="ProcessId" (
        echo Killing backend process %%a
        taskkill /F /PID %%a
    )
)

echo Done killing processes.
pause
