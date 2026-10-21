@echo off
rem Installs offline Whisper for singing (whisper.cpp + Whisper large-v3, the model Online mode uses; turbo on smaller graphics cards). Uses the NVIDIA GPU when there is one. Close Lyric Follow first. Needs internet once (~1.8 GB).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-whisper.ps1"
