@echo off
REM Install YOLO MCP Server Dependencies for Python 3.13

echo Installing YOLO MCP Server dependencies (Python 3.13 compatible)...

REM Navigate to YOLO server directory
cd backend\mcp_server\yolo_mcp_server

REM First, upgrade pip to latest version
python -m pip install --upgrade pip

REM Install dependencies with Python 3.13 compatible versions
echo Installing dependencies with flexible version constraints...
pip install --upgrade -r requirements.txt

REM Verify installations
echo Verifying critical installations...
python -c "import cv2; print('OpenCV:', cv2.__version__)" 2>nul || echo "Warning: OpenCV not properly installed"
python -c "import torch; print('PyTorch:', torch.__version__)" 2>nul || echo "Warning: PyTorch not properly installed" 
python -c "import ultralytics; print('Ultralytics:', ultralytics.__version__)" 2>nul || echo "Warning: Ultralytics not properly installed"

echo.
echo Installation complete!
echo You can now run 'npm start' to start all servers including YOLO MCP.
echo.
echo If you encounter any issues, try running:
echo   pip install torch torchvision ultralytics opencv-python-headless
echo.
pause
