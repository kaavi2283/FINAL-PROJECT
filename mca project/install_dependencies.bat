@echo off
echo ===================================================
echo   MCQ QUIZ APP - DEPENDENCY INSTALLER
echo ===================================================
echo.

set "NODE_PATH=%~dp0.env_tools\node\extracted\node-v20.11.0-win-x64"
if exist "%NODE_PATH%\node.exe" (
    set "PATH=%NODE_PATH%;%PATH%"
)

echo [+] Installing Backend Dependencies...
cd "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install backend dependencies.
    pause
    exit /b %errorlevel%
)

echo.
echo [+] Installing Frontend Dependencies...
cd "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install frontend dependencies.
    pause
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo   DEPENDENCY INSTALLATION COMPLETED SUCCESSFULLY!
echo ===================================================
echo.
pause
