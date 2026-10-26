@echo off
chcp 65001 >nul
title XilerMusic
cd /d "%~dp0"

set "NODE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE%" set "NODE=node"

echo ============================================
echo   XilerMusic - starting
echo ============================================
echo.

echo [1/2] Starting server on port 8080 ...
start "XilerMusic" /min "%NODE%" server.js
timeout /t 8 /nobreak >nul

echo [2/2] Opening browser ...
start "" "http://127.0.0.1:8080"

echo.
echo Done. One minimized window "XilerMusic" is now running:
echo   - Web UI + music source API on port 8080
echo.
echo To stop: close that window.
echo.
pause
