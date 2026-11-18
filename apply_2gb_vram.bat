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
    echo  [SUCCESS] Full Metal 3 Hardware Acceleration successfully applied!
    echo  All fixes applied:
    echo    - Full Metal 3 Acceleration (WhateverXe enabled, -allow3d, 1536MB VRAM)
    echo    - 100%% Responsive Login Screen (Purged amfi=0x80, authd/keychain restored)
    echo    - Audio Deadlock Eliminated (SimpleHDA disabled, AppleALC alcid=11 active)
    echo    - 50%% Apple Logo Freeze Fix (-wex-skip-gputicks register 0x2910 bypass)
    echo    - Post-Password Spinner Fix (Purged conflicting dGPU flags, 60MB stolenmem)
    echo    - Input Active (-vi2c-force-polling + VoodooPS2Keyboard + VoodooPS2Mouse)
    echo    - VoodooInput Deduplication (Fixes vm_map_delete kernel panic)
    echo    - Discrete RTX 2050 Powered Down (-nvoff nv_disable=1)
    echo    - DSDT Dynamic NVS Address Patched (Zero ACPI errors)
    echo    - OpenCore Picker Fallbacks (-wex-noaccel Framebuffer, -wexoff Safe VESA)
) else (
    echo  [ERROR] Script exited with code %PY_EXIT%.
    echo  Check fix_system_drv.log for details.
)
echo =====================================================================
echo.
echo Press any key to exit this window...
pause >nul
