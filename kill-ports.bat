@echo off
echo ===================================================
echo SWAN STUDIOS - CLEARING PORT PROCESSES
echo ===================================================
echo.
echo Checking for processes using port 5000 (backend)...

FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') DO (
  echo Found process: %%P using port 5000
  echo Attempting to terminate process %%P...
  taskkill /F /PID %%P
  if errorlevel 1 (
    echo Failed to terminate process. You may need administrator privileges.
  ) else (
    echo Process terminated successfully.
  )
)

echo.
echo Checking for processes using port 5173 (frontend)...

FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') DO (
  echo Found process: %%P using port 5173
  echo Attempting to terminate process %%P...
  taskkill /F /PID %%P
)

echo.
echo Port clearing complete!
echo ===================================================
echo.
