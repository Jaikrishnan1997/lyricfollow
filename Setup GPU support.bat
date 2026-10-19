@echo off
rem Installs the NVIDIA CUDA 12 / cuDNN 9 runtime files for the GPU voice engine (free, from NVIDIA's official packages). Close Lyric Follow first. Needs internet once (~1.7 GB).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-gpu.ps1"
