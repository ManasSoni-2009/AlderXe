@echo off
title SYSTEM_DRV (S:) 2GB VRAM Inserter - Lenovo LOQ AlderXe
cd /d "%~dp0"

:: Check for Administrator permissions
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Administrator privileges required to access EFI partition S:\
    echo [INFO] Requesting elevation...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo =====================================================================
echo  Lenovo LOQ 15IAX9 / 15IRX9 - WhateverXe 2GB VRAM Inserter
echo  Target: S:\EFI\OC (SYSTEM_DRV - NVMe Partition 1)
echo =====================================================================
echo.

python "%~dp0fix_system_drv.py"

echo.
echo =====================================================================
echo  Press any key to exit...
echo =====================================================================
pause >nul
