@echo off
echo ===================================================
echo   MCQ QUIZ APP - STARTUP LAUNCHER
echo ===================================================
echo.

set "NODE_PATH=%~dp0.env_tools\node\extracted\node-v20.11.0-win-x64"
if exist "%NODE_PATH%\node.exe" (
    set "PATH=%NODE_PATH%;%PATH%"
)

echo [+] Starting application servers and local database...
cd "%~dp0"
node run.js
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start the application.
    pause
    exit /b %errorlevel%
)
pause
