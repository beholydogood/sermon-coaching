@echo off
chcp 65001 > nul 2>&1
title AI Sermon Coaching Studio

echo.
echo  =========================================================
echo    AI Sermon Coaching Studio  -  Starting...
echo  =========================================================
echo.

cd /d "%~dp0"

:: Node.js binary location
set "NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "TSX=%~dp0node_modules\tsx\dist\cli.mjs"

:: Verify node exists
if not exist "%NODE%" (
    echo [ERROR] Node.js not found.
    echo Expected: %NODE%
    echo.
    pause
    exit /b 1
)

:: Verify tsx exists
if not exist "%TSX%" (
    echo [ERROR] tsx not found. Run: pnpm install
    echo Expected: %TSX%
    echo.
    pause
    exit /b 1
)

:: Kill any existing process on port 3000
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 "') do (
    taskkill /pid %%a /f > nul 2>&1
)

:: Open browser after 3 seconds
start "" cmd /c "timeout /t 3 /nobreak > nul && start http://localhost:3000"

echo [OK] Server starting at http://localhost:3000
echo [OK] Browser will open automatically in 3 seconds...
echo.
echo  Press Ctrl+C to stop the server.
echo  =========================================================
echo.

:: Start server
"%NODE%" "%TSX%" server.ts

pause
