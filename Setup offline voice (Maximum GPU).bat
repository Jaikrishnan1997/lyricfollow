@echo off
rem Installs the Maximum offline voice model (Whisper large-v3, most accurate; needs an NVIDIA GPU for live use). Close Lyric Follow first. Needs internet once (~1 GB).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-voice.ps1" -Choice 5
