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
    echo    - Login Freeze Fix (Eliminated amfi=0x80 to unblock authd/securityd keychain unlock)
    echo    - Metal Freeze Fix (Removed -wex-skip-gputicks and force-online phantom displays)
    echo    - Audio Deadlock Fix (Disabled SimpleHDA to unblock coreaudiod login hook)
    echo    - VoodooInput Deduplication (Fixes vm_map_delete kernel panic)
    echo    - PS2 Trackpad/Mouse Conflict Eliminated
    echo    - Input Freeze Fix (-vi2c-force-polling)
    echo    - Safe Picker Entries Added (-wex-noaccel Framebuffer & -wexoff Safe Mode)
) else (
    echo  [ERROR] Script exited with code %PY_EXIT%.
    echo  Check fix_system_drv.log for details.
)
echo =====================================================================
echo.
echo Press any key to exit this window...
pause >nul
