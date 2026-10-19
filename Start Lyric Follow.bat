@echo off
rem Starts Lyric Follow on this computer (no install needed). Keep the small window open during the service.
cd /d "%~dp0"
start "Lyric Follow" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
