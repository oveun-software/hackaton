@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas Node.js 22.16 o posterior.
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
echo Abre http://127.0.0.1:4317 en tu navegador.
echo Pulsa Ctrl+C para detener Cora Atlas.
call npm.cmd start
if errorlevel 1 pause
