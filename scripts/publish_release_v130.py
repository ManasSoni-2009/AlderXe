import urllib.request
import json
import os

token = os.environ.get("GITHUB_TOKEN", "")
repo = "ManasSoni-2009/AlderXe"

rel_body = """## XeControl v1.3.0 — Metal 3 VESA Escape & Input Freeze Resolution

### Critical Fixes in v1.3.0:
1. **Touchpad & Keyboard Input Freeze Resolution**:
   - Injected `-vi2c-force-polling` into `boot-args`.
   - Forces `VoodooI2C` into timer polling mode, completely bypassing Alder Lake GPIO APIC interrupt storms that locked up all keyboard and trackpad HID input at the macOS login screen.
2. **Gray Lock Screen Clock & VESA Mode Escape**:
   - **Tiling Sanitation**: Completely removed legacy Coffee Lake `AAPL,GfxYTile` from `PciRoot(0x0)/Pci(0x2,0x0)` (which corrupted Gen12 Xe-LP tiling aperture and forced 7MB VESA fallback).
   - **Internal Display Port Adoption**: Injected `force-online = <01 00 00 00>` to bypass `adoptDPBootAUX()` handoff stalls on the internal eDP panel.
   - **144Hz Panel CDCLK Fix**: Injected `enable-cdclk-frequency-fix = <01 00 00 00>` for high-refresh display timing synchronization.
   - **Frequency Polling Bypass**: Injected `-wex-skip-gputicks` into `boot-args` to prevent register `0x2910` hardware timeout hangs during WindowServer graphics initialization.
   - **1536 MB Unified VRAM**: Preserved Apple Tiger Lake donor profile standard (`framebuffer-unifiedmem = <00 00 00 60>`).
3. **AuxKC Rebuilder Integration**:
   - `XeControl.app` and `install_auxkc.sh` provide automated linking of `AppleIntelTGLGraphics.kext` and Metal bundles into the Auxiliary Kernel Collection via `sudo kmutil install --volume-root / --update-all`.
4. **100% Peripheral Protection**:
   - Wi-Fi (`AirportItlwm`), Bluetooth, Audio (`AppleALC`), NVMe (`NVMeFix`), and NullMoth 2.9 baseline are strictly preserved.
"""

rel_data = {
    "tag_name": "v1.3.0",
    "target_commitish": "main",
    "name": "XeControl v1.3.0 — Metal 3 VESA Escape, Input Polling Fix & 1536MB Alder Lake-HX",
    "body": rel_body,
    "draft": False,
    "prerelease": False
}

req = urllib.request.Request(
    f"https://api.github.com/repos/{repo}/releases",
    data=json.dumps(rel_data).encode("utf-8"),
    headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "XeControl-Publisher"
    }
)

try:
    with urllib.request.urlopen(req) as resp:
        rel = json.loads(resp.read().decode())
        print("Created Release:", rel["tag_name"], rel["html_url"])
        upload_url = rel["upload_url"].split("{")[0]
except Exception as e:
    print("Release create returned (checking existing):", e)
    get_req = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/releases/tags/v1.3.0",
        headers={"Authorization": f"token {token}", "User-Agent": "XeControl-Publisher"}
    )
    with urllib.request.urlopen(get_req) as resp:
        rel = json.loads(resp.read().decode())
        upload_url = rel["upload_url"].split("{")[0]

for fname in ["XeControl.dmg", "NullMoth-1401-Tahoe-Universal.dmg"]:
    fpath = os.path.join(r"D:\gpu-switcher-pro-nov-17-2026-7-55-33-pm", fname)
    if os.path.exists(fpath):
        with open(fpath, "rb") as f:
            fbytes = f.read()
        print(f"Uploading {fname} ({len(fbytes)} bytes)...")
        up_req = urllib.request.Request(
            f"{upload_url}?name={fname}",
            data=fbytes,
            headers={
                "Authorization": f"token {token}",
                "Content-Type": "application/x-apple-diskimage",
                "User-Agent": "XeControl-Publisher"
            }
        )
        with urllib.request.urlopen(up_req) as resp:
            asset = json.loads(resp.read().decode())
            print(f"  -> Uploaded {fname}: {asset['browser_download_url']}")
