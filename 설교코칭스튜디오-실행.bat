@echo off
title AI Sermon Coaching Studio

echo ==========================================================
echo    AI Sermon Coaching and Book Writing Studio Starting...
echo ==========================================================
echo.

cd /d "%~dp0"

set "NODE_EXE="
where node.exe >nul 2>nul
if %errorlevel% equ 0 (
    set "NODE_EXE=node.exe"
) else if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_EXE=C:\Program Files\nodejs\node.exe"
) else if exist "C:\Users\behol\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    set "NODE_EXE=C:\Users\behol\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)

if "%NODE_EXE%"=="" (
    echo [ERROR] Node.js not found.
    pause
    exit /b 1
)

echo [1/2] Opening browser at http://localhost:3000 ...
start "" cmd /c "timeout /t 2 /nobreak > nul && start http://localhost:3000"

echo [2/2] Server is running at http://localhost:3000 - Do not close this window.
echo.

"%NODE_EXE%" "%~dp0node_modules\tsx\dist\cli.mjs" server.ts

pause
