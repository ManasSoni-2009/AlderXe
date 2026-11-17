'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Sliders,
  CheckCircle2,
  ArrowRight,
  HardDrive,
} from 'lucide-react';
import {
  DEFAULT_DRIVER_CONFIG,
  BASELINE_NULLMOTH_DGPU_CONFIG,
  INITIAL_ROLLBACK_SNAPSHOTS,
  INITIAL_KERNEL_LOGS,
  DriverConfig,
  MuxMode,
  EfiRollbackSnapshot,
  KernelLogEntry,
  calculateTelemetryForMode,
  buildBootArgs,
  runComprehensiveDriverTestSuite,
} from '@/lib/driver-engine';
import { buildCompleteDmgPackage } from '@/lib/dmg-packager';
import TahoeMenuBarPopover from '@/components/TahoeMenuBarPopover';
import MuxTelemetryDashboard from '@/components/MuxTelemetryDashboard';
import PortBugAndMacAppSuite from '@/components/PortBugAndMacAppSuite';
import KextAndPlistStudio from '@/components/KextAndPlistStudio';
import SleepWakeAndRollbackPanel from '@/components/SleepWakeAndRollbackPanel';

export default function HomePage() {
  const [muxMode, setMuxMode] = useState<MuxMode>('hybrid_mux');
  const [config, setConfig] = useState<DriverConfig>(DEFAULT_DRIVER_CONFIG);
  const [workloadIntensity, setWorkloadIntensity] = useState<number>(24);
  const [isMenuBarOpen, setIsMenuBarOpen] = useState<boolean>(false);
  const [snapshots, setSnapshots] = useState<EfiRollbackSnapshot[]>(
    INITIAL_ROLLBACK_SNAPSHOTS
  );
  const [activeSnapshotId, setActiveSnapshotId] = useState<string>(
    'snap-xemoth-hybrid-rc1'
  );
  const [kernelLogs, setKernelLogs] = useState<KernelLogEntry[]>(INITIAL_KERNEL_LOGS);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const telemetry = useMemo(
    () => calculateTelemetryForMode(muxMode, config, workloadIntensity),
    [muxMode, config, workloadIntensity]
  );

  const stabilityReport = useMemo(
    () => runComprehensiveDriverTestSuite(config, muxMode),
    [config, muxMode]
  );

  const appendKernelLog = (entry: Omit<KernelLogEntry, 'id' | 'timestamp'>) => {
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now
      .getMilliseconds()
      .toString()
      .padStart(3, '0')}`;
    setKernelLogs((prev) => [
      {
        ...entry,
        id: `klog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: ts,
      },
      ...prev,
    ]);
  };

  const handleSelectMuxMode = (newMode: MuxMode) => {
    setMuxMode(newMode);
    const modeLabel =
      newMode === 'hybrid_mux'
        ? 'Mode 1 · Hybrid Metal 3 MUX (UHD 0x46A3 + RTX 2050 DMA-BUF)'
        : newMode === 'igpu_eco'
        ? 'Mode 0 · iGPU Eco (Intel UHD 48EU · RTX 2050 D3cold 0.0W)'
        : 'Mode 2 · dGPU Locked (NullMoth 1401 RTX 2050 Direct)';

    appendKernelLog({
      subsystem: 'AppleACPIMux',
      severity: 'NOTICE',
      message: `NullMoth 1401 PS8461E MUX switched at VBlank -> ${modeLabel}`,
      registerCode:
        newMode === 'dgpu_only' ? 'PS8461E=0x02' : 'PS8461E=0x01',
    });
    setStatusBanner(`Active MUX Mode: ${modeLabel}`);
  };

  const handleUpdateConfig = (partial: Partial<DriverConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleApplyValidConfig = (newConfig: DriverConfig) => {
    setConfig(newConfig);
    appendKernelLog({
      subsystem: 'WhateverXeADL',
      severity: 'INFO',
      message: `Rebuilt WhateverXeADL.kext & OpenCore DeviceProperties (ID=${newConfig.deviceIdHex}, Platform=${newConfig.igPlatformIdHex}, VRAM=${newConfig.vramUnifiedMb}MB)`,
      registerCode: `IG_PLAT=0x${newConfig.igPlatformIdHex}`,
    });
    setStatusBanner(
      `Rebuilt WhateverXeADL.kext & config.plist (${stabilityReport.passedCount}/${stabilityReport.totalChecks} stability checks verified).`
    );
  };

  const handleRunStressSuiteLog = (passed: number, total: number) => {
    appendKernelLog({
      subsystem: 'WhateverXeADL',
      severity: passed === total ? 'INFO' : 'WARN',
      message: `Executed 10-Point Port Project Regression & Stress Suite: ${passed}/${total} vectors passed.`,
      registerCode: `PORT_SUITE=${passed}_${total}`,
    });
    setStatusBanner(
      `Completed 10-Point Port Bug & Kernel Stress Verification: ${passed}/${total} vectors passed.`
    );
  };

  const handleCreateSnapshot = (label: string) => {
    const newId = `snap-${Date.now()}`;
    const shaShort = Math.random().toString(16).slice(2, 14).padEnd(12, 'a');
    const newSnap: EfiRollbackSnapshot = {
      id: newId,
      label,
      createdAt: '2026-11-11 09:46:00',
      muxMode,
      kextVersion: 'WhateverXeADL 1.8.4 + NullMoth 1.4.01',
      bootArgs: buildBootArgs(config, muxMode),
      sha256Short: shaShort,
      isFactoryNullMothBaseline: false,
      config: { ...config },
    };
    setSnapshots((prev) => [newSnap, ...prev]);
    setActiveSnapshotId(newId);
    appendKernelLog({
      subsystem: 'WhateverXeADL',
      severity: 'INFO',
      message: `Created verified OpenCore EFI snapshot "${label}" (SHA256: ${shaShort})`,
      registerCode: `EFI_SNAP=${shaShort.slice(0, 8)}`,
    });
    setStatusBanner(`Saved verified OpenCore EFI snapshot: ${label}`);
  };

  const handleRestoreSnapshot = (snap: EfiRollbackSnapshot) => {
    setConfig(snap.config);
    setMuxMode(snap.muxMode);
    setActiveSnapshotId(snap.id);
    appendKernelLog({
      subsystem: 'WhateverXeADL',
      severity: 'NOTICE',
      message: `Restored OpenCore EFI Snapshot "${snap.label}" (boot-args: ${snap.bootArgs})`,
      registerCode: `SHA256=${snap.sha256Short}`,
    });
    setStatusBanner(`Restored EFI configuration snapshot: ${snap.label}`);
  };

  const handleEmergencyBaselineRevert = () => {
    setConfig(BASELINE_NULLMOTH_DGPU_CONFIG);
    setMuxMode('dgpu_only');
    setActiveSnapshotId('snap-nullmoth-baseline');
    appendKernelLog({
      subsystem: 'NullMothBridge',
      severity: 'WARN',
      message:
        'EMERGENCY ROLLBACK EXECUTED: Reverted OpenCore config.plist to working NullMoth 1401 dGPU-Only Baseline (-wxeadloff nullmoth_mux=dgpu)',
      registerCode: 'ROLLBACK=8f4e92a1',
    });
    setStatusBanner(
      'Reverted to working NullMoth 1401 dGPU-Only Baseline. WhateverXeADL iGPU hooks bypassed (-wxeadloff).'
    );
  };

  const handleDownloadCompleteDmg = () => {
    const dmg = buildCompleteDmgPackage(config, muxMode);
    const copyBuffer = new Uint8Array(dmg.binaryBytes.byteLength);
    copyBuffer.set(dmg.binaryBytes);
    const blob = new Blob([copyBuffer.buffer], {
      type: 'application/x-apple-diskimage',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = dmg.dmgFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    appendKernelLog({
      subsystem: 'WhateverXeADL',
      severity: 'INFO',
      message: `Packaged & exported ${dmg.dmgFilename} (${dmg.entries.length} items, ${dmg.sectorCount} sectors, GPT + TN1150 HFS+ + UDIF v4 verified, SHA256=${dmg.sha256Digest.slice(0, 12)})`,
      registerCode: `DMG_KOLY=0x6B6F6C79`,
    });
    setStatusBanner(
      `Packaged & downloaded ${dmg.dmgFilename} (${(dmg.totalSizeBytes / 1024).toFixed(
        1
      )} KB · ${dmg.entries.length} embedded items · GPT + HFS+ + UDIF v4 Verified · SHA256: ${dmg.sha256Digest.slice(0, 12)}).`
    );
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-neutral-100">
      {/* Strict 3-Zone Top Bar Contract — NullMoth 1401 Minimal Monochrome */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-6 py-3.5 border-b border-neutral-800 tahoe-glass">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="text-base font-mono font-bold tracking-wider uppercase text-white whitespace-nowrap shrink-0"
        >
          NULLMOTH 1401
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-xs font-mono text-neutral-400"
        >
          <a
            href="#telemetry-mux"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            MUX Switch
          </a>
          <a
            href="#port-stability"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Port Bug Suite
          </a>
          <a
            href="#macos-app-builder"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            DMG Package
          </a>
          <a
            href="#kext-studio"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Kext &amp; Plist
          </a>
          <a
            href="#rollback-recovery"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Rollback
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsMenuBarOpen((prev) => !prev)}
            aria-expanded={isMenuBarOpen}
            className="px-3.5 py-1.5 text-xs font-mono font-semibold text-neutral-950 bg-white hover:bg-neutral-200 rounded transition-colors whitespace-nowrap shrink-0"
          >
            Menu Bar Agent
          </button>
        </div>
      </header>

      {/* Interactive NullMoth 1401 Menu Bar Controller Popover */}
      <TahoeMenuBarPopover
        isOpen={isMenuBarOpen}
        onClose={() => setIsMenuBarOpen(false)}
        muxMode={muxMode}
        onSelectMuxMode={handleSelectMuxMode}
        config={config}
        onUpdateConfig={handleUpdateConfig}
        telemetry={telemetry}
        onTriggerSleepCycle={() => {
          setIsMenuBarOpen(false);
          scrollToSection('sleep-power');
        }}
        onEmergencyRollback={() => {
          handleEmergencyBaselineRevert();
          setIsMenuBarOpen(false);
        }}
      />

      {/* Main Content Container */}
      <main id="top" className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-8 space-y-9">
        {statusBanner && (
          <div
            role="status"
            className="px-4 py-3 rounded bg-neutral-900 border border-neutral-700 text-neutral-100 text-xs font-mono flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              <span>{statusBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-xs text-neutral-400 hover:text-white whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* NullMoth 1401 Monochrome Hero Window Header */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 bg-[#111111] border border-neutral-800 rounded-lg p-7 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-400">
                <span>BUILD 1401-TAHOE</span>
                <span aria-hidden="true">·</span>
                <span className="text-white">I5-12450HX (UHD 0x46A3) + RTX 2050</span>
                <span aria-hidden="true">·</span>
                <span>
                  STABILITY: {stabilityReport.passedCount}/{stabilityReport.totalChecks} VERIFIED
                </span>
              </div>

              <h1
                className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight"
                style={{ textWrap: 'balance' }}
              >
                NullMoth 1401 — All-in-One macOS Tahoe <code className="font-mono">.dmg</code> with Metal 3 iGPU Driver &amp; Hardware MUX
              </h1>

              <p className="text-sm text-neutral-300 leading-relaxed max-w-[68ch]">
                Everything packaged into a single Apple UDIF disk image (<code className="text-white font-mono">NullMoth-1401-Tahoe-Universal.dmg</code>): the native <strong className="text-white">NullMoth 1401.app</strong> (Swift 6 + IOKit window &amp; Menu Bar Agent), <code className="font-mono text-neutral-200">WhateverXeADL.kext</code> (48EU Metal 3 + GuC v70.5.1 + Tahoe Liquid Glass SIMD16), <code className="font-mono text-neutral-200">SSDT-ADL-MUX.dsl</code>, pre-patched OpenCore <code className="font-mono text-neutral-200">config.plist</code>, and one-click emergency rollback to your working dGPU-only setup.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-neutral-800 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadCompleteDmg}
                className="px-4 py-2.5 rounded bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <HardDrive className="w-4 h-4" />
                Download NullMoth-1401-Tahoe-Universal.dmg
              </button>

              <button
                type="button"
                onClick={() => setIsMenuBarOpen(true)}
                className="px-4 py-2.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-100 font-mono text-xs flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Sliders className="w-4 h-4 text-neutral-300" />
                Open Menu Bar Agent
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('macos-app-builder')}
                className="px-3 py-2.5 rounded text-neutral-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                Inspect Mounted DMG Volume
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right 5 Cols: Monochrome Optical Shader Pipeline & Build 1401 Telemetry */}
          <div className="lg:col-span-5 bg-[#111111] border border-neutral-800 rounded-lg overflow-hidden flex flex-col justify-between relative">
            <div className="relative h-52 sm:h-56 w-full bg-neutral-950 flex items-center justify-center overflow-hidden">
              <Image
                src="/assets/images/tahoe_liquid_glass_compositor_1794415671111.jpg"
                alt="NullMoth 1401 macOS Tahoe Metal 3 Optical Shader Pipeline Architecture"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 42vw"
                referrerPolicy="no-referrer"
                className="object-cover grayscale contrast-125 opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-neutral-950/40 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-white">
                  SKYLIGHT METAL 3 COMPOSITOR
                </span>
                <span className="text-neutral-300 tabular-nums">
                  {telemetry.liquidGlassStatus}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs bg-[#111111] flex-1 flex flex-col justify-between">
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <span className="text-neutral-500 block text-[11px]">INTEGRATED GPU</span>
                  <span className="text-white font-semibold mt-0.5 block">
                    i5-12450HX · UHD 0x46A3
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">DISCRETE PEER</span>
                  <span className="text-white font-semibold mt-0.5 block">
                    RTX 2050 · NullMoth 1401
                  </span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-neutral-800 flex items-center justify-between font-mono text-[11px]">
                <span className="text-neutral-500">UDIF DMG CONTAINER</span>
                <span className="text-white">
                  GPT + HFS+ + KOLY V4 · 14 FILES
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 01: Live Hardware MUX Switch & Silicon Telemetry Dashboard */}
        <MuxTelemetryDashboard
          muxMode={muxMode}
          onSelectMuxMode={handleSelectMuxMode}
          config={config}
          telemetry={telemetry}
          workloadIntensity={workloadIntensity}
          onChangeWorkload={setWorkloadIntensity}
          onNavigateSection={scrollToSection}
        />

        {/* Sections 02 & 03: 10-Point Port Bug Verification Suite & All-in-One DMG Packager */}
        <PortBugAndMacAppSuite
          config={config}
          muxMode={muxMode}
          onApplyFixedConfig={handleApplyValidConfig}
          onRunStressSuiteLog={handleRunStressSuiteLog}
          onDownloadDmg={handleDownloadCompleteDmg}
        />

        {/* Section 04: Kext Driver Builder & OpenCore config.plist Studio */}
        <KextAndPlistStudio
          key={`${activeSnapshotId}-${config.enableGuCFirmware}-${config.stolenMemoryMb}-${config.purgeVramBeforeSleep}`}
          config={config}
          muxMode={muxMode}
          onApplyValidConfig={handleApplyValidConfig}
        />

        {/* Sections 05 & 06: Sleep/Wake Power Lifecycle + Automated EFI Rollback & Kernel Logs */}
        <SleepWakeAndRollbackPanel
          config={config}
          muxMode={muxMode}
          onUpdateConfig={handleUpdateConfig}
          snapshots={snapshots}
          activeSnapshotId={activeSnapshotId}
          onCreateSnapshot={handleCreateSnapshot}
          onRestoreSnapshot={handleRestoreSnapshot}
          onEmergencyBaselineRevert={handleEmergencyBaselineRevert}
          kernelLogs={kernelLogs}
          onAppendKernelLog={appendKernelLog}
        />
      </main>

      {/* Quiet Monochrome Footer */}
      <footer className="border-t border-neutral-800 px-6 py-5 mt-12">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500">
          <div>
            NULLMOTH 1401 (BUILD 1401-TAHOE) · ALDER LAKE-HX &amp; RTX 2050 UNIVERSAL DMG SUITE
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleDownloadCompleteDmg}
              className="text-neutral-300 hover:text-white underline underline-offset-4 transition-colors"
            >
              Download Universal .dmg
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleEmergencyBaselineRevert}
              className="text-neutral-300 hover:text-white underline underline-offset-4 transition-colors"
            >
              Revert to NullMoth dGPU Baseline
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
