@echo off
rem One-time setup of the offline voice engine (free, open source). Needs internet only during this setup.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-voice.ps1"
