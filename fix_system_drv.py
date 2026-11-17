import os
import sys
import plistlib

print("[1/4] Verifying S: (SYSTEM_DRV) mount...")
if not os.path.exists(r"S:\EFI\OC"):
    print(r"ERROR: S:\EFI\OC not found! Run 'mountvol S: /S' first.")
    sys.exit(1)

cfg_bak = r"S:\EFI\OC\config-backup-dgpu-working.plist"
cfg_target = r"S:\EFI\OC\config.plist"
dsdt_bak = r"S:\EFI\OC\ACPI\DSDT-backup-discrete.aml"
dsdt_target = r"S:\EFI\OC\ACPI\DSDT.aml"

if not os.path.exists(cfg_bak):
    print(f"ERROR: Golden backup not found at {cfg_bak}")
    sys.exit(1)

if not os.path.exists(dsdt_bak):
    print(f"ERROR: Golden DSDT backup not found at {dsdt_bak}")
    sys.exit(1)

print(r"[2/4] Reading golden baseline exclusively from S:\EFI\OC...")
with open(cfg_bak, "rb") as f:
    config = plistlib.load(f)

# 1. NVRAM boot-args: ensure -v, -allow3d, -disablegfxfirmware, -igfxdvmt
nvram_uuid = "7C436110-AB2A-4BBB-A880-FE41995C9F82"
nvram_add = config["NVRAM"]["Add"][nvram_uuid]
orig_args = nvram_add.get("boot-args", "")

clean_args = orig_args
for bad in ["npci=0x2000", "npci=0x3000", "ipc_control_port_options=0", "amfi_get_out_of_my_way=0x1"]:
    clean_args = clean_args.replace(bad, "")
clean_args = " ".join(clean_args.split())

if not clean_args.startswith("-v"):
    clean_args = "-v " + clean_args

# Ensure required graphics acceleration flags
for arg in ["-allow3d", "-disablegfxfirmware", "-igfxdvmt"]:
    if arg not in clean_args:
        clean_args += f" {arg}"

nvram_add["boot-args"] = clean_args
print(f"  -> Updated boot-args: {clean_args}")

# 2. Ensure boot-args is in NVRAM -> Delete
nvram_del = config["NVRAM"]["Delete"][nvram_uuid]
if "boot-args" not in nvram_del:
    nvram_del.append("boot-args")

# 3. UEFI Quirks & APFS
config["UEFI"]["APFS"]["HideVerbose"] = False
config["UEFI"]["Quirks"]["RequestBootVarRouting"] = True

# 4. Kernel Quirks
config["Kernel"]["Quirks"]["DisableIoMapper"] = True

# 5. DeviceProperties: Intel UHD Graphics (Alder Lake-HX 0x468B) with 2GB VRAM & Framebuffer Acceleration
dev_add = config["DeviceProperties"]["Add"]
dev_add["PciRoot(0x0)/Pci(0x2,0x0)"] = {
    "AAPL,GfxYTile": b"\x01\x00\x00\x00",
    "device-id": b"\x8b\x46\x00\x00",
    # Framebuffer Acceleration & 2048 MB (2 GB) Unified VRAM
    "framebuffer-patch-enable": b"\x01\x00\x00\x00",
    "framebuffer-stolenmem": b"\x00\x00\x00\x04",    # 64 MB stolen memory from BIOS
    "framebuffer-fbmem": b"\x00\x00\x00\x02",        # 32 MB framebuffer memory
    "framebuffer-unifiedmem": b"\x00\x00\x00\x80",    # 2048 MB (2 GB) Unified Metal VRAM
    "framebuffer-con0-enable": b"\x01\x00\x00\x00",   # Internal eDP connector
    "framebuffer-con0-altsync": b"\x01\x00\x00\x00",  # 144Hz high refresh rate sync
    "enable-backlight-registers-fix": b"\x01\x00\x00\x00",
    "enable-dbuf-early-optimizer": b"\x01\x00\x00\x00",
    "enable-dvmt-calc-fix": b"\x01\x00\x00\x00",
    "enable-metal": b"\x01\x00\x00\x00",
    "model": "Intel UHD Graphics (Alder Lake-HX 8086:468B)"
}
print("  -> Injected 2GB Unified VRAM & Framebuffer Acceleration properties (framebuffer-unifiedmem: 2048MB)")

# 6. Kernel Kext reordering: Lilu #1, VirtualSMC #2
kexts = config["Kernel"]["Add"]
lilu_list = [k for k in kexts if k["BundlePath"] == "Lilu.kext"]
smc_names = ["VirtualSMC.kext", "SMCBatteryManager.kext", "SMCProcessor.kext", "SMCSuperIO.kext", "SMCLightSensor.kext"]
smc_list = [k for k in kexts if k["BundlePath"] in smc_names]
others = [k for k in kexts if k["BundlePath"] not in smc_names and k["BundlePath"] != "Lilu.kext"]

if lilu_list:
    config["Kernel"]["Add"] = lilu_list + smc_list + others
    print("  -> Reordered kexts: Lilu.kext followed immediately by VirtualSMC.kext")

# Write clean plist to S:\EFI\OC\config.plist (No BOM, pure Apple DTD)
with open(cfg_target, "wb") as f:
    plistlib.dump(config, f, sort_keys=False)
print(f"[3/4] SUCCESS: Wrote 2GB VRAM config.plist to {cfg_target} ({os.path.getsize(cfg_target)} bytes)")

# 7. Patch DSDT on S: from S:\EFI\OC\ACPI\DSDT-backup-discrete.aml
print(r"[4/4] Patching DSDT directly from S:\EFI\OC\ACPI\DSDT-backup-discrete.aml...")
with open(dsdt_bak, "rb") as f:
    dsdt_bytes = bytearray(f.read())

dsdt_bytes[0x00874B] = 0x73  # SANB
dsdt_bytes[0x008B5B] = 0x73  # SANV
dsdt_bytes[0x00CB94] = 0x73  # GNVS
dsdt_bytes[0x00CCD6] = 0x73  # GNVS
dsdt_bytes[0x00D79C] = 0x73  # PNVB
dsdt_bytes[0x09DE75] = 0x4B  # _CRS MMIO window

dsdt_bytes[9] = 0
chk = sum(dsdt_bytes) & 0xFF
dsdt_bytes[9] = (256 - chk) & 0xFF
assert (sum(dsdt_bytes) & 0xFF) == 0, "DSDT Checksum verification failed!"

with open(dsdt_target, "wb") as f:
    f.write(dsdt_bytes)
print(f"SUCCESS: Wrote patched DSDT.aml to {dsdt_target} ({len(dsdt_bytes)} bytes, checksum: 0x{dsdt_bytes[9]:02X})")
print("\n[DONE] SYSTEM_DRV (S:) is 100% updated with 2GB VRAM and ready to reboot.")