REM filepath: c:\Users\Flight\Desktop\My Websites\Dark-Matter-JS---Game-Engine\start-server.bat
@echo off
echo ============================================================================
echo Dark Matter JS - Multiplayer Server
echo ============================================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Start the server
echo Starting multiplayer server on port 8080...
echo Press Ctrl+C to stop the server
echo.
node server.js

pause