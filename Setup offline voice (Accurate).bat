@echo off
rem Installs the Accurate offline voice model (best for Malayalam/Tamil). Close Lyric Follow first. Needs internet once (~640 MB).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-voice.ps1" -Choice 3
