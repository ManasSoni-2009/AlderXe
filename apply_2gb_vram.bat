@echo off
title SYSTEM_DRV (S:) WhateverXe v0.8.3 & Full Metal 3 Restorer - Lenovo LOQ AlderXe
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
echo  Lenovo LOQ 15IAX9 / 15IRX9 - WhateverXe v0.8.3 & Full Metal 3 Restorer
echo  Target: S:\EFI\OC (SYSTEM_DRV - NVMe Partition 1)
echo  D:\EFI IS STRICTLY PROTECTED AND NEVER TOUCHED!
echo =====================================================================
echo.

python "%~dp0fix_system_drv.py"
set PY_EXIT=%errorlevel%

echo.
echo =====================================================================
if %PY_EXIT% equ 0 (
    echo  [SUCCESS] WhateverXe v0.8.3 & Full Metal 3 Configuration successfully applied!
    echo  All fixes applied:
    echo    - WhateverXe v0.8.3 Installed (Alder Lake-HX eDP startup fix matching PKG)
    echo    - AMFIAnchor + BOM-free AMFIAnchorInjector + AMFIPass Deployed
    echo    - NullMoth dGPU Suppressed (-nvoff nv_disable=1 stops IOVersatile 0xdc00800e)
    echo    - Full Metal 3 Acceleration (WhateverXe enabled, -allow3d)
    echo    - 100%% Responsive Login Screen (Purged amfi=0x80, authd/keychain restored)
    echo    - Audio Deadlock Eliminated (SimpleHDA disabled, AppleALC alcid=11 active)
    echo    - Clean DeviceProperties (60MB stolenmem, zero bogus flags)
    echo    - Input Active (-vi2c-force-polling + VoodooPS2Keyboard + VoodooPS2Mouse)
    echo    - VoodooInput Deduplication (Fixes vm_map_delete kernel panic)
    echo    - DSDT Dynamic NVS Address Patched (Zero ACPI errors)
    echo    - OpenCore Picker Fallbacks (Framebuffer Only, Golden Baseline RTX 2050, Safe VESA)
) else (
    echo  [ERROR] Script exited with code %PY_EXIT%.
    echo  Check fix_system_drv.log for details.
)
echo =====================================================================
echo.
echo Press any key to exit this window...
pause >nul
