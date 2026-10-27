@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22.16 or later is required.
  pause
  exit /b 1
)
if not exist .env copy .env.example .env >nul
if not exist node_modules (
  call npm.cmd ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
powershell.exe -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 8088 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  echo.
  echo NOTICE: No listener was found on the default Nightshift port 8088.
  echo Start Nightshift, or check your custom runtime address in Connections.
  echo You can still upload CVs and use the recorded demo. Docker is not required for Nightshift.
  echo.
)
echo Open http://127.0.0.1:4317 in your browser.
echo Press Ctrl+C to stop TalentLens.
call npm.cmd start
if errorlevel 1 pause
