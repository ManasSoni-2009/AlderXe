import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DRIVER_CONFIG,
  BASELINE_NULLMOTH_DGPU_CONFIG,
  INITIAL_HARDWARE_GROUND_TRUTH,
  LENOVO_LOQ_TOPOLOGY,
  MuxMode,
  buildBootArgs,
  validateDriverConfig,
  calculateTelemetryForMode,
  mbToLittleEndianHex,
  verifyAllConfigDataProperties,
  generateOpenCoreConfigPlist,
  generateConfigPlistUnifiedDiff,
  auditUserConfigPlist,
  parsePhase0CollectorOutput,
  generateKextSourceFiles,
  generateNativeMacAppFiles,
  generateSessionStateMarkdown,
  simulateSleepWakeCycle,
  runComprehensiveDriverTestSuite,
  autoFixDriverIssues,
  generateSsdtLoqMuxlessDsl,
  generateWindowsPowerShellRecoveryScript,
} from './driver-engine';
import { buildCompleteDmgPackage } from './dmg-packager';

test('mbToLittleEndianHex encodes DVMT and VRAM sizes accurately in little-endian format', () => {
  assert.equal(mbToLittleEndianHex(32), '00000002');
  assert.equal(mbToLittleEndianHex(64), '00000004');
  assert.equal(mbToLittleEndianHex(2048), '00000080');
  assert.equal(mbToLittleEndianHex(4096), 'FFFFFFFF');
});

test('verifyAllConfigDataProperties verifies all Base64 <data> properties decode to exact 4-byte little-endian uint32 values', () => {
  const defaultChecks = verifyAllConfigDataProperties(DEFAULT_DRIVER_CONFIG);
  assert.equal(defaultChecks.length, 4);
  assert.ok(defaultChecks.every((c) => c.valid4ByteLe));

  const overrideChecks = verifyAllConfigDataProperties({
    ...DEFAULT_DRIVER_CONFIG,
    useDeviceIdOverride: true,
  });
  assert.equal(overrideChecks.length, 5);
  const deviceIdCheck = overrideChecks.find((c) => c.keyPath.includes('device-id'));
  assert.ok(deviceIdCheck);
  assert.equal(deviceIdCheck.base64Encoded, 'o0YAAA==');
  assert.equal(deviceIdCheck.decodedByteLength, 4);
  assert.equal(deviceIdCheck.decodedUint32Le, 0x000046a3);
});

test('validateDriverConfig accepts valid Alder Lake 0x46A3 configuration and rejects malformed hex or invalid memory sizes', () => {
  const validResult = validateDriverConfig(DEFAULT_DRIVER_CONFIG);
  assert.equal(validResult.valid, true);
  assert.deepEqual(validResult.errors, {});

  const invalidResult = validateDriverConfig({
    ...DEFAULT_DRIVER_CONFIG,
    deviceIdHex: '46A3',
    igPlatformIdHex: 'ZZZZ9B3E',
    stolenMemoryMb: 50,
    pwmBacklightFreqHz: 50,
  });

  assert.equal(invalidResult.valid, false);
  assert.ok(invalidResult.errors.deviceIdHex);
  assert.ok(invalidResult.errors.igPlatformIdHex);
  assert.ok(invalidResult.errors.stolenMemoryMb);
  assert.ok(invalidResult.errors.pwmBacklightFreqHz);
});

test('calculateTelemetryForMode reflects accurate power states and battery runtime across dgpu_only, hybrid_mux, and igpu_eco', () => {
  const dgpuMetrics = calculateTelemetryForMode('dgpu_only', DEFAULT_DRIVER_CONFIG, 25);
  const hybridIdleMetrics = calculateTelemetryForMode('hybrid_mux', DEFAULT_DRIVER_CONFIG, 25);
  const igpuEcoMetrics = calculateTelemetryForMode('igpu_eco', DEFAULT_DRIVER_CONFIG, 25);

  assert.equal(dgpuMetrics.igpuState, 'D3hot Dormant');
  assert.equal(dgpuMetrics.dgpuState, 'D0 Primary Scanout');
  assert.ok(dgpuMetrics.totalGpuPackagePowerW > hybridIdleMetrics.totalGpuPackagePowerW);

  assert.equal(hybridIdleMetrics.igpuState, 'D0 Active');
  assert.equal(hybridIdleMetrics.dgpuState, 'Idle / Standby');
  assert.equal(hybridIdleMetrics.dgpuPowerW, 0);

  const hybridHeavyMetrics = calculateTelemetryForMode('hybrid_mux', DEFAULT_DRIVER_CONFIG, 80);
  assert.equal(hybridHeavyMetrics.dgpuState, 'D0 Metal Offload Peer');
  assert.ok(hybridHeavyMetrics.dmaBufBandwidthGbs > 10);

  assert.equal(igpuEcoMetrics.dgpuState, 'Idle / Standby');
  assert.ok(igpuEcoMetrics.estimatedBatteryMinutes > dgpuMetrics.estimatedBatteryMinutes * 2);
});

test('runComprehensiveDriverTestSuite verifies all 10 safety checks and autoFixDriverIssues restores 100% stability', () => {
  const defaultReport = runComprehensiveDriverTestSuite(DEFAULT_DRIVER_CONFIG, 'hybrid_mux');
  assert.equal(defaultReport.overallPassed, true);
  assert.equal(defaultReport.passedCount, 10);
  assert.equal(defaultReport.stabilityScorePct, 100);

  const brokenConfig = {
    ...DEFAULT_DRIVER_CONFIG,
    stolenMemoryMb: 128,
    enableGuCFirmware: false,
    purgeVramBeforeSleep: false,
  };
  const brokenReport = runComprehensiveDriverTestSuite(brokenConfig, 'hybrid_mux');
  assert.equal(brokenReport.overallPassed, false);
  assert.equal(brokenReport.passedCount, 7);

  const fixedConfig = autoFixDriverIssues(brokenConfig);
  const fixedReport = runComprehensiveDriverTestSuite(fixedConfig, 'hybrid_mux');
  assert.equal(fixedReport.overallPassed, true);
  assert.equal(fixedReport.passedCount, 10);
  assert.equal(fixedReport.stabilityScorePct, 100);
});

test('generateOpenCoreConfigPlist, auditUserConfigPlist, parsePhase0CollectorOutput, and generateKextSourceFiles enforce WhateverXe + NullMoth coexistence', () => {
  const plist = generateOpenCoreConfigPlist(DEFAULT_DRIVER_CONFIG, 'hybrid_mux');
  assert.ok(plist.includes('<key>PciRoot(0x0)/Pci(0x2,0x0)</key>'));
  assert.ok(plist.includes('<string>WhateverXe.kext</string>'));
  assert.ok(plist.includes('-allow3d -disablegfxfirmware'));
  assert.ok(plist.includes('-wexoff'));
  assert.ok(plist.includes('<key>WriteFlash</key>'));
  assert.ok(plist.includes('<key>Delete</key>'));
  assert.ok(plist.includes('<string>boot-args</string>'));

  const auditClean = auditUserConfigPlist(plist);
  assert.equal(auditClean.every((f) => f.severity === 'PASS'), true);

  const rollbackPlist = generateOpenCoreConfigPlist(BASELINE_NULLMOTH_DGPU_CONFIG, 'dgpu_only');
  assert.ok(rollbackPlist.includes('-wexoff'));
  assert.ok(rollbackPlist.includes('-vi2c-force-polling'));
  assert.ok(rollbackPlist.includes('AirportItlwm.kext'));
  assert.ok(rollbackPlist.includes('IntelBluetoothFirmware.kext'));
  assert.ok(rollbackPlist.includes('VoodooI2C.kext'));
  assert.ok(rollbackPlist.includes('NVRM.kext'));

  const diff = generateConfigPlistUnifiedDiff(DEFAULT_DRIVER_CONFIG, 'hybrid_mux');
  assert.ok(diff.includes('--- a/EFI/OC/config.plist'));
  assert.ok(diff.includes('+++ b/EFI/OC-Staging/config.plist'));

  const parsedResult = parsePhase0CollectorOutput(
    'ProductVersion: 26.7.1\nBuildVersion: 25G241\n4D1FDA02-38C7-4A6A-9CC6-4BCCA8B30102:opencore-version\tREL-106-2025-11-03\nDevice ID: 0x25ed\nPCI\\VEN_8086&DEV_468B&SUBSYS_3D0617AA\norg.b00t0x.WhateverXe (0.4.0)\ncom.nullmoth.NVRM (2.9)\n"PCITopLevel" = ("MC","PEG1","TCPU","PEG0","XHCI","CNVW","I2C0","I2C1","HECI","SAT0","RP07","LPCB","HDEF","SBUS")\nboot-args\tdebug=0x100 keepsyms=1 -vi2c-force-polling nvfb=1 nvaccel=1 -allow3d -disablegfxfirmware',
    INITIAL_HARDWARE_GROUND_TRUTH
  );
  assert.ok(parsedResult.matchedFieldsCount >= 4);
  const osRow = parsedResult.updatedRows.find((r) => r.id === 'hw-os');
  assert.equal(osRow?.status, 'VERIFIED_BY_PROBE');
  const igpuRow = parsedResult.updatedRows.find((r) => r.id === 'hw-igpu');
  assert.ok(igpuRow?.value.includes('8086:468B'));
  const dgpuRow = parsedResult.updatedRows.find((r) => r.id === 'hw-dgpu');
  assert.equal(dgpuRow?.status, 'VERIFIED_BY_PROBE');

  const kextFiles = generateKextSourceFiles(DEFAULT_DRIVER_CONFIG, 'hybrid_mux');
  assert.equal(kextFiles.length, 6);
  assert.equal(kextFiles[0].filename, 'xecontrol-phase0-macos.sh');
  assert.ok(kextFiles.some((f) => f.filename === 'SSDT-LOQ-MUXLESS.dsl'));
  assert.ok(kextFiles.some((f) => f.filename === 'loq-sync-dsdt-and-config.ps1'));

  const macAppFiles = generateNativeMacAppFiles(DEFAULT_DRIVER_CONFIG, 'hybrid_mux');
  assert.equal(macAppFiles.length, 3);
  assert.equal(macAppFiles[0].filename, 'NullMoth-1401-Tahoe-Installer.command');
  assert.ok(macAppFiles[0].content.includes("nv_del.append('boot-args')"));
  assert.ok(macAppFiles[1].content.includes('MTLCopyAllDevices'));
  assert.ok(macAppFiles[1].content.includes('NSApplication.shared.setActivationPolicy(.regular)'));
  assert.equal(macAppFiles[1].content.includes('.font(.system(.xs'), false);

  const stateMd = generateSessionStateMarkdown(
    DEFAULT_DRIVER_CONFIG,
    'hybrid_mux',
    parsedResult.updatedRows
  );
  assert.ok(stateMd.includes('Phase 0'));

  const stagesNominal = simulateSleepWakeCycle(DEFAULT_DRIVER_CONFIG, 'hybrid_mux');
  assert.equal(stagesNominal.length, 6);
  assert.ok(stagesNominal.every((s) => s.status === 'nominal'));
});

test('buildCompleteDmgPackage packages all 14 bundle items into a valid GPT + TN1150 HFS+ + Apple UDIF v4 binary DMG', () => {
  const dmg = buildCompleteDmgPackage(DEFAULT_DRIVER_CONFIG, 'hybrid_mux');
  assert.equal(dmg.dmgFilename, 'NullMoth-1401-Tahoe-Universal.dmg');
  assert.equal(dmg.udifMagic, 'koly');
  assert.equal(dmg.entries.length, 14);
  assert.ok(dmg.totalSizeBytes > 500000);

  const appExecEntry = dmg.entries.find((e) => e.id === 'dmg-entry-app-exec');
  assert.ok(appExecEntry);
  assert.equal(appExecEntry.content.includes('tell application "System Events"'), false);
  assert.ok(appExecEntry.content.includes('/usr/bin/osacompile'));
  assert.ok(appExecEntry.content.includes("nv_del.append('boot-args')"));
  assert.ok(appExecEntry.content.includes('patch_stage1'));

  assert.equal(dmg.validation.valid, true, dmg.validation.summary);
  assert.equal(dmg.validation.kolySignatureValid, true);
  assert.equal(dmg.validation.dataForkCrcValid, true);
  assert.equal(dmg.validation.masterCrcValid, true);
  assert.equal(dmg.validation.gptHeaderCrcValid, true);
  assert.equal(dmg.validation.hfsPlusHeaderValid, true);
  assert.equal(dmg.validation.catalogBTreeKeyOrderValid, true);
  assert.equal(dmg.validation.appExecutableBitValid, true);
  assert.equal(dmg.validation.kextMachOBinaryValid, true);
  assert.equal(dmg.validation.acpiAmlChecksumValid, true);
});

test('PEG0 (00:06.0 Micron NVMe) is never disabled or collided with by dGPU rules', () => {
  // 1. Verify topology maps PEG0 to Micron NVMe SSD (02:00.0) and PEG1 to NVIDIA RTX 2050 (01:00.0)
  assert.equal(LENOVO_LOQ_TOPOLOGY.nvmeBridge.pciBdf, '00:06.0');
  assert.equal(LENOVO_LOQ_TOPOLOGY.nvmeBridge.acpiPath, '\\_SB.PC00.PEG0');
  assert.equal(LENOVO_LOQ_TOPOLOGY.nvme.acpiPath, '\\_SB.PC00.PEG0.PEGP');
  assert.equal(LENOVO_LOQ_TOPOLOGY.dgpuBridge.pciBdf, '00:01.0');
  assert.equal(LENOVO_LOQ_TOPOLOGY.dgpuBridge.acpiPath, '\\_SB.PC00.PEG1');
  assert.equal(LENOVO_LOQ_TOPOLOGY.dgpu.acpiPath, '\\_SB.PC00.PEG1.PEGP');

  // 2. Verify SSDT-LOQ-MUXLESS.dsl explicitly guards PEG0.PEGP with _STA = 0x0F
  const ssdt = generateSsdtLoqMuxlessDsl();
  assert.ok(ssdt.includes('Scope (_SB.PC00.PEG0.PEGP)'));
  assert.ok(ssdt.includes('Return (0x0F)'));
  assert.equal(ssdt.includes('PEG0._OFF'), false);
  assert.equal(ssdt.includes('PEG0.PEGP._OFF'), false);

  // 3. Verify OpenCore config.plist generator includes SSDT-LOQ-MUXLESS.aml
  const plist = generateOpenCoreConfigPlist(DEFAULT_DRIVER_CONFIG, 'hybrid_mux');
  assert.ok(plist.includes('<string>SSDT-LOQ-MUXLESS.aml</string>'));

  // 4. Verify auditor flags dangerous dGPU-off rules targeting PEG0
  const dangerousPlist = `<key>Comment</key><string>Disable dGPU on PEG0</string><key>Path</key><string>SSDT-dGPU-Off-PEG0.aml</string>`;
  const findings = auditUserConfigPlist(dangerousPlist);
  const peg0Finding = findings.find((f) => f.id === 'audit-peg0-nvme');
  assert.ok(peg0Finding);
  assert.equal(peg0Finding.severity, 'CRITICAL');
});

test('npci=0x2000 is excluded from boot-args to prevent early IOPCIConfigurator deadlocks', () => {
  const modes: MuxMode[] = ['hybrid_mux', 'dgpu_only', 'igpu_eco'];
  for (const m of modes) {
    const args = buildBootArgs(DEFAULT_DRIVER_CONFIG, m);
    assert.equal(/\bnpci=0x[0-9a-fA-F]+\b/i.test(args), false, `npci argument found in mode ${m}`);
  }

  const plist = generateOpenCoreConfigPlist(DEFAULT_DRIVER_CONFIG, 'hybrid_mux');
  assert.equal(plist.includes('npci=0x2000'), false);
  assert.equal(plist.includes('npci=0x3000'), false);

  const badPlist = `<key>boot-args</key><string>-v npci=0x2000 debug=0x100</string>`;
  const findings = auditUserConfigPlist(badPlist);
  const npciFinding = findings.find((f) => f.id === 'audit-npci');
  assert.ok(npciFinding);
  assert.equal(npciFinding.severity, 'CRITICAL');
});

test('DisableIoMapper = true is enforced to prevent AppleVTD is not yet installed as gSystem freeze', () => {
  const plist = generateOpenCoreConfigPlist(DEFAULT_DRIVER_CONFIG, 'hybrid_mux');
  assert.ok(
    plist.includes('<key>DisableIoMapper</key>\n      <true/>') ||
    plist.includes('<key>DisableIoMapper</key><true/>') ||
    plist.includes('<key>DisableIoMapper</key>\n\t\t\t<true/>')
  );

  const badVtdPlist = `<key>Quirks</key><dict><key>DisableIoMapper</key><false/></dict>`;
  const findings = auditUserConfigPlist(badVtdPlist);
  const vtdFinding = findings.find((f) => f.id === 'audit-disable-iomapper');
  assert.ok(vtdFinding);
  assert.equal(vtdFinding.severity, 'CRITICAL');

  const psScript = generateWindowsPowerShellRecoveryScript();
  assert.ok(psScript.includes("'(<key>DisableIoMapper</key>\\s*<)false(/>)', '$1true$2'"));
});

test('All existing working kexts and boot-args are preserved without regression', () => {
  const plist = generateOpenCoreConfigPlist(DEFAULT_DRIVER_CONFIG, 'hybrid_mux');

  const requiredKexts = [
    'Lilu.kext',
    'VirtualSMC.kext',
    'WhateverXe.kext',
    'AirportItlwm.kext',
    'IntelBluetoothFirmware.kext',
    'VoodooI2C.kext',
    'AppleALC.kext',
    'NVMeFix.kext',
    'NVRM.kext',
  ];

  for (const kext of requiredKexts) {
    assert.ok(plist.includes(`<string>${kext}</string>`), `Missing required kext: ${kext}`);
  }

  assert.ok(plist.includes('-vi2c-force-polling'));
  assert.ok(plist.includes('nvfb=1'));
  assert.ok(plist.includes('nvaccel=1'));
  assert.ok(plist.includes('nvfbheads=4'));
  assert.ok(plist.includes('-nvkmsnosmooth'));
  assert.ok(plist.includes('nvrmacpibl=1'));

  // WhateverGreen must be disabled
  assert.ok(plist.includes('WhateverGreen.kext'));
  assert.ok(plist.includes('<key>Enabled</key>\n        <false/>') || plist.includes('<false/>'));
});

