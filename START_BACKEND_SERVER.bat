@echo off
echo ========================================
echo Starting Backend Server
echo ========================================
echo.

cd backend

echo Checking if server is already running...
netstat -ano | findstr :5001 >nul
if %errorlevel% == 0 (
    echo.
    echo WARNING: Port 5001 is already in use!
    echo.
    echo Please stop the existing server first:
    echo 1. Find the terminal/command prompt where backend is running
    echo 2. Press Ctrl+C to stop it
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)

echo.
echo Starting server...
echo.
npm start

pause

