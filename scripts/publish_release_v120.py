import urllib.request
import json
import os

token = os.environ.get("GITHUB_TOKEN", "")
repo = "ManasSoni-2009/AlderXe"

rel_body = """## XeControl v1.2.0 — Lenovo LOQ (i5-12450HX + RTX 2050) macOS Tahoe

### What Is Fixed & New in v1.2.0:
1. **ACPI Parse Execution Fix**:
   - Replaced static byte offset patching with the live, genuine Lenovo UEFI Dynamic Graphic DSDT table dumped directly from Windows registry (665,178 bytes, 0 mod 256 checksum).
   - Eliminates `ACPI parse execution failed` early boot errors completely.
2. **Community WhateverXe 1536 MB (1.5 GB) VRAM Configuration**:
   - Configures `framebuffer-unifiedmem` = `<00 00 00 60>` (0x60000000 = 1536 MB), matching Apple's native `AppleIntelTGLGraphics` donor profile.
   - Omitted legacy Coffee Lake stolenmem keys to eliminate assertion panics against 32MB BIOS DVMT.
3. **Full XeControl macOS Controller Suite**:
   - Full MUX Control menu: **Hybrid Metal 3** (1536MB UHD + RTX 2050 Metal), **Eco Mode** (0.0W dGPU on battery), and **Discrete Mode** (RTX 2050 only).
   - VESA 7MB Escape & AuxKC Rebuilder (`kmutil install --volume-root / --update-all`).
   - One-click Safe Rollback to golden backup (`config-backup-dgpu-working.plist`).
   - Live Dark Glass HTML Dashboard and diagnostics reporting.
"""

rel_data = {
    "tag_name": "v1.2.0",
    "target_commitish": "main",
    "name": "XeControl v1.2.0 — 1536MB Tiger Lake Profile, ACPI Parse Fix & Full MUX Suite",
    "body": rel_body,
    "draft": False,
    "prerelease": False
}

if not token:
    print("Please set GITHUB_TOKEN environment variable.")
    exit(0)

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
    print("Release create returned:", e)
    get_req = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/releases/tags/v1.2.0",
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
