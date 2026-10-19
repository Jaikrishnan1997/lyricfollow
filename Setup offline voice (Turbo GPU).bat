@echo off
rem Installs the Turbo offline voice model (top quality; meant for laptops with an NVIDIA GPU). Close Lyric Follow first. Needs internet once (~560 MB).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-voice.ps1" -Choice 4
