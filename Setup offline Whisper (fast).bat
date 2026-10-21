@echo off
rem Installs offline Whisper with the faster large-v3-turbo model (for graphics cards with less than 6 GB, e.g. GTX 1650). Close Lyric Follow first. Needs internet once (~550 MB model; the program is kept if already installed).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-whisper.ps1" -Turbo
