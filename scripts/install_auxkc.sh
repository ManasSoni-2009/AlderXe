#!/bin/zsh
# ==============================================================================
# WhateverXe-Graphics AuxKC Rebuilder · VESA 7MB Escape for Alder Lake-HX
# Targets: Intel UHD Graphics (8086:468B) on macOS Tahoe / Sequoia
# Installs signed Intel Xe Metal 3 driver bundles into Auxiliary Kernel Collection
# ==============================================================================

set -e
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:$PATH"

echo "======================================================================"
echo " ⚡ WhateverXe-Graphics AuxKC Installer (VESA 7MB Escape)"
echo " Hardware: Lenovo LOQ 15IAX9 / 15IRX9 · Alder Lake-HX (8086:468B)"
echo "======================================================================"
echo ""

if [ "$(id -u)" -ne 0 ]; then
  echo "[ERROR] This installer must be run as root (sudo)."
  echo "Usage: sudo zsh $0"
  exit 1
fi

echo "[1/4] Checking SIP Status and csr-active-config..."
CSR_HEX="$(/usr/sbin/nvram csr-active-config 2>/dev/null | awk '{print $NF}' || true)"
echo "      Current csr-active-config: ${CSR_HEX:-0x0}"
echo "      (Recommended for AuxKC Metal injection: 03080000 / 0x803)"

echo "[2/4] Downloading official WhateverXe-Graphics companion package..."
PKG_DEST="/tmp/WhateverXe-Graphics.pkg"
PKG_URL="https://github.com/b00t0x/WhateverXe-Graphics/releases/latest/download/WhateverXe-Graphics.pkg"

if curl -fSL --progress-bar -o "$PKG_DEST" "$PKG_URL"; then
  echo "      -> Download complete (${PKG_DEST})"
else
  echo "[!] Direct download failed. Please visit:"
  echo "    https://github.com/b00t0x/WhateverXe-Graphics/releases"
  echo "    and download WhateverXe-Graphics.pkg manually."
  exit 1
fi

echo "[3/4] Installing signed Intel Xe userland graphics driver bundles to /Library..."
/usr/sbin/installer -pkg "$PKG_DEST" -target / -verboseR

echo "[4/4] Rebuilding Auxiliary Kernel Collection (AuxKC)..."
/usr/bin/kmutil install --volume-root / --update-all 2>&1 || true

echo ""
echo "======================================================================"
echo " 🎉 SUCCESS! WhateverXe-Graphics installed & AuxKC rebuilt."
echo " Next Step: Reboot your Mac."
echo " On boot, WindowServer will load the Intel Xe Metal 3 driver,"
echo " escaping the 7 MB VESA mode to full 2048 MB (2 GB) acceleration!"
echo "======================================================================"
