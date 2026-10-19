@echo off
rem Stops and starts the offline voice engines (after changing the model or GPU settings). The app window can stay open.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -RestartVoice
