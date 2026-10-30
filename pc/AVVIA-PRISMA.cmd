@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0avvia.ps1"
if errorlevel 1 pause
