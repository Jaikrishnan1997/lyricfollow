@echo off
rem One-time setup of the offline voice engine with the Balanced model (no questions asked).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-voice.ps1" -Choice 2
