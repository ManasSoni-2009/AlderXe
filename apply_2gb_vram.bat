@echo off
title SYSTEM_DRV (S:) 1536MB VRAM & ACPI Fix - Lenovo LOQ AlderXe
cd /d "%~dp0"

:: Check for Administrator permissions
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Administrator privileges required to access EFI partition S:\
    echo [INFO] Requesting elevation via UAC...
    powershell -Command "Start-Process cmd -ArgumentList '/k cd /d \"\"%~dp0\"\" && \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo =====================================================================
echo  Lenovo LOQ 15IAX9 / 15IRX9 - WhateverXe 1536MB VRAM & ACPI Fix Inserter
echo  Target: S:\EFI\OC (SYSTEM_DRV - NVMe Partition 1)
echo  D:\EFI IS STRICTLY PROTECTED AND NEVER TOUCHED!
echo =====================================================================
echo.

python "%~dp0fix_system_drv.py"
set PY_EXIT=%errorlevel%

echo.
echo =====================================================================
if %PY_EXIT% equ 0 (
    echo  [SUCCESS] Configuration successfully updated!
    echo  All fixes applied:
    echo    - 50%% Apple Logo Freeze Fix (Restored -wex-skip-gputicks register 0x2910 polling bypass)
    echo    - Tahoe AuxKC Kext Fix (Restored cs_enforcement_disable=1 and amfi=0x80)
    echo    - Display & Panel Fix (Restored device-id 8086:468B, force-online eDP unblank, cdclk-fix)
    echo    - Post-Password Login Freeze Fix (-wex-noaccel Framebuffer Mode + purged conflicting NVIDIA flags)
    echo    - Audio Baseline Preserved (SimpleHDA + AppleALC)
    echo    - VoodooInput Deduplication (Fixes vm_map_delete kernel panic)
    echo    - PS2 Trackpad/Mouse Conflict Eliminated
    echo    - Input Freeze Fix (-vi2c-force-polling)
    echo    - Safe Picker Entries Added (-allow3d Metal 3D, -wex-noaccel Framebuffer, -wexoff Safe Mode)
) else (
    echo  [ERROR] Script exited with code %PY_EXIT%.
    echo  Check fix_system_drv.log for details.
)
echo =====================================================================
echo.
echo Press any key to exit this window...
pause >nul
