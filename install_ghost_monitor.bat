@echo off
echo Installing Virtual Display Driver (Ghost Monitor) for Hyper-V VM
echo This script will install the IddSampleDriver to fix Parsec connection issues
echo.

REM Search for the driver file in common locations
set DRIVER_FOUND=0
set DRIVER_PATH=

echo Searching for IddSampleDriver.inf...

REM Check C:\Virtual-Display-Driver
if exist "C:\Virtual-Display-Driver\IddSampleDriver.inf" (
    set DRIVER_PATH=C:\Virtual-Display-Driver
    set DRIVER_FOUND=1
    goto :install
)

REM Check C:\Easy-GPU-PV
if exist "C:\Easy-GPU-PV\IddSampleDriver.inf" (
    set DRIVER_PATH=C:\Easy-GPU-PV
    set DRIVER_FOUND=1
    goto :install
)

REM Check C:\Program Files\Virtual-Display-Driver
if exist "C:\Program Files\Virtual-Display-Driver\IddSampleDriver.inf" (
    set DRIVER_PATH=C:\Program Files\Virtual-Display-Driver
    set DRIVER_FOUND=1
    goto :install
)

REM Check C:\Program Files\Easy-GPU-PV
if exist "C:\Program Files\Easy-GPU-PV\IddSampleDriver.inf" (
    set DRIVER_PATH=C:\Program Files\Easy-GPU-PV
    set DRIVER_FOUND=1
    goto :install
)

REM Check root C:\
if exist "C:\IddSampleDriver.inf" (
    set DRIVER_PATH=C:\
    set DRIVER_FOUND=1
    goto :install
)

REM If not found, try to search recursively (slower)
echo Driver not found in common locations. Searching entire C: drive...
for /r "C:\" %%f in (IddSampleDriver.inf) do (
    set DRIVER_PATH=%%~dpf
    set DRIVER_FOUND=1
    goto :install
)

:install
if %DRIVER_FOUND%==1 (
    echo Found driver directory at: %DRIVER_PATH%
    echo Installing driver...
    pnputil.exe /add-driver "%DRIVER_PATH%\IddSampleDriver.inf" /install
    if %errorlevel%==0 (
        echo.
        echo ================================================
        echo DRIVER INSTALLED SUCCESSFULLY!
        echo ================================================
        echo.
        echo IMPORTANT: If VM window is stuck/frozen:
        echo ============================================
        echo You may be in "Enhanced Session Mode" (Remote Desktop Mode).
        echo This locks display settings and prevents seeing the ghost monitor.
        echo.
        echo TO FIX ENHANCED SESSION MODE:
        echo 1. At the top menu bar (File | Action | Media | View)
        echo 2. Click "View"
        echo 3. Uncheck "Enhanced Session" (turn it OFF)
        echo 4. VM may show login screen again - log in
        echo 5. Now you can access Display Settings
        echo.
        echo Next steps after disabling Enhanced Mode:
        echo ==========================================
        echo 1. Right-click Desktop -^> Display Settings
        echo 2. You should now see Monitor 1 and Monitor 2
        echo 3. Click Monitor 2 (Ghost Monitor)
        echo 4. Scroll to "Multiple displays" -^> Select "Show only on 2"
        echo 5. Click "Keep Changes"
        echo 6. Close Hyper-V Viewer (it may go black - this is normal!)
        echo 7. Connect via Parsec
        echo.
        echo The Hyper-V window going black means it worked!
        echo Parsec will now connect to the ghost monitor.
    ) else (
        echo.
        echo ================================================
        echo AUTOMATIC INSTALLATION FAILED
        echo ================================================
        echo Error code: %errorlevel%
        echo.
        echo Trying manual installation method...
        echo.
        echo MANUAL INSTALLATION STEPS:
        echo 1. Open File Explorer
        echo 2. Navigate to: %DRIVER_PATH%
        echo 3. Right-click "IddSampleDriver.inf"
        echo 4. Select "Install"
        echo 5. Click Yes/Install on any prompts
        echo 6. Continue with steps 1-6 above
        echo.
        echo If manual install fails, use Parsec's built-in driver:
        echo 1. Open Parsec Settings in VM
        echo 2. Go to Host tab
        echo 3. Scroll to "Virtual Display Driver"
        echo 4. Click "Install"
        echo 5. Restart VM
    )
) else (
    echo.
    echo ================================================
    echo DRIVER FILE NOT FOUND
    echo ================================================
    echo IddSampleDriver.inf not found in any location!
    echo.
    echo Please ensure the driver was copied to your VM during setup.
    echo Check these locations manually:
    echo - C:\Virtual-Display-Driver\
    echo - C:\Easy-GPU-PV\
    echo - C:\Program Files\Virtual-Display-Driver\
    echo - C:\Program Files\Easy-GPU-PV\
    echo - C:\
    echo.
    echo If you can't find it, use Parsec's built-in Virtual Display Driver:
    echo 1. Open Parsec Settings in VM
    echo 2. Go to Host tab
    echo 3. Scroll to "Virtual Display Driver"
    echo 4. Click "Install"
    echo 5. Restart VM
)

echo.
echo Press any key to exit...
pause >nul