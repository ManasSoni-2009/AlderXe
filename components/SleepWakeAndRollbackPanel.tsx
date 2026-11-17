'use client';

import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Search,
} from 'lucide-react';
import {
  DriverConfig,
  EfiRollbackSnapshot,
  KernelLogEntry,
  MuxMode,
  simulateSleepWakeCycle,
} from '@/lib/driver-engine';

interface SleepWakeAndRollbackPanelProps {
  config: DriverConfig;
  muxMode: MuxMode;
  onUpdateConfig: (partial: Partial<DriverConfig>) => void;
  snapshots: EfiRollbackSnapshot[];
  activeSnapshotId: string;
  onCreateSnapshot: (label: string) => void;
  onRestoreSnapshot: (snapshot: EfiRollbackSnapshot) => void;
  onEmergencyBaselineRevert: () => void;
  kernelLogs: KernelLogEntry[];
  onAppendKernelLog: (entry: Omit<KernelLogEntry, 'id' | 'timestamp'>) => void;
}

export default function SleepWakeAndRollbackPanel({
  config,
  muxMode,
  onUpdateConfig,
  snapshots,
  activeSnapshotId,
  onCreateSnapshot,
  onRestoreSnapshot,
  onEmergencyBaselineRevert,
  kernelLogs,
  onAppendKernelLog,
}: SleepWakeAndRollbackPanelProps) {
  const sleepStages = React.useMemo(
    () => simulateSleepWakeCycle(config, muxMode),
    [config, muxMode]
  );
  const [cycleCount, setCycleCount] = useState<number>(1);
  const [newSnapshotName, setNewSnapshotName] = useState<string>('');
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [logFilterSubsystem, setLogFilterSubsystem] = useState<string>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');

  const handleRunSleepWakeCycle = () => {
    setCycleCount((c) => c + 1);

    const totalWakeMs = sleepStages
      .filter((s) => s.phase === 'wake')
      .reduce((acc, s) => acc + s.durationMs, 0);

    onAppendKernelLog({
      subsystem: 'IOPMrootDomain',
      severity: sleepStages.some((s) => s.status === 'warning') ? 'WARN' : 'INFO',
      message: `Completed ${config.sleepMode.toUpperCase()} Sleep -> Wake cycle #${
        cycleCount + 1
      } in ${totalWakeMs}ms (GuC v70 reload + PS8461E MUX latch verified)`,
      registerCode: `WAKE_LATENCY=${totalWakeMs}ms`,
    });
  };

  const handleCreateSnapshotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSnapshotName.trim();
    if (!trimmed) {
      setSnapshotError('Please enter a descriptive label for your EFI rollback snapshot.');
      return;
    }
    setSnapshotError(null);
    onCreateSnapshot(trimmed);
    setNewSnapshotName('');
  };

  const filteredLogs = kernelLogs.filter((entry) => {
    const matchesSub =
      logFilterSubsystem === 'ALL' || entry.subsystem === logFilterSubsystem;
    const matchesQuery =
      !logSearchQuery.trim() ||
      entry.message.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      entry.registerCode.toLowerCase().includes(logSearchQuery.toLowerCase());
    return matchesSub && matchesQuery;
  });

  const totalWakeTimeMs = sleepStages
    .filter((s) => s.phase === 'wake')
    .reduce((acc, s) => acc + s.durationMs, 0);

  return (
    <div className="space-y-8">
      {/* Section 05: Automated System Sleep & Wake Cycle Power Management */}
      <section
        id="sleep-power"
        className="bg-[#111111] border border-neutral-800 rounded-lg p-6 space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-neutral-800">
          <div>
            <div className="text-xs font-mono text-neutral-400 flex items-center gap-2">
              <span>ACPI S0IX MODERN STANDBY &amp; S3 STR</span>
              <span aria-hidden="true">·</span>
              <span className="text-white tabular-nums">
                WAKE RESUME: {totalWakeTimeMs} MS
              </span>
              <span aria-hidden="true">·</span>
              <span>SSDT-PNLF-ADL + SSDT-GPRW-SLEEP</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white mt-1">
              05. Automated Sleep &amp; Wake Cycle Power Management
            </h2>
          </div>

          <button
            type="button"
            onClick={handleRunSleepWakeCycle}
            className="px-4 py-2 rounded bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Execute Sleep / Wake Stress Test (Cycle #{cycleCount})
          </button>
        </div>

        {/* Power Management Controls Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">
                ACPI Sleep Residency Target
              </span>
              <span className="text-[11px] text-neutral-400">
                Alder Lake-HX Package C10 / S0ix vs S3
              </span>
            </div>
            <select
              aria-label="Select ACPI Sleep Residency Target"
              value={config.sleepMode}
              onChange={(e) =>
                onUpdateConfig({
                  sleepMode: e.target.value as 's0ix_modern' | 's3_deep',
                })
              }
              className="px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-xs font-mono text-white"
            >
              <option value="s0ix_modern">S0ix (0.38W)</option>
              <option value="s3_deep">S3 Deep STR</option>
            </select>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">
                Evict NullMoth VRAM Before Sleep
              </span>
              <span className="text-[11px] text-neutral-400">
                Fixes PORT-BUG-07 page fault on wake
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.purgeVramBeforeSleep}
              aria-label="Evict NullMoth VRAM Before Sleep"
              onClick={() =>
                onUpdateConfig({ purgeVramBeforeSleep: !config.purgeVramBeforeSleep })
              }
              className={`px-3 py-1 rounded text-xs font-mono transition-colors border ${
                config.purgeVramBeforeSleep
                  ? 'bg-white text-neutral-950 border-white font-semibold'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-700'
              }`}
            >
              {config.purgeVramBeforeSleep ? 'Enabled' : 'Bypassed'}
            </button>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">
                Re-Latch PS8461E MUX on _WAK
              </span>
              <span className="text-[11px] text-neutral-400">
                Fixes PORT-BUG-08 lid-wake dark screen
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.restoreMuxLatchOnWake}
              aria-label="Re-Latch PS8461E MUX on _WAK"
              onClick={() =>
                onUpdateConfig({ restoreMuxLatchOnWake: !config.restoreMuxLatchOnWake })
              }
              className={`px-3 py-1 rounded text-xs font-mono transition-colors border ${
                config.restoreMuxLatchOnWake
                  ? 'bg-white text-neutral-950 border-white font-semibold'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-700'
              }`}
            >
              {config.restoreMuxLatchOnWake ? 'Latched' : 'Unlatched'}
            </button>
          </div>
        </div>

        {/* 6-Stage Sleep/Wake Pipeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sleepStages.map((stage) => (
            <div
              key={stage.stageIndex}
              className={`rounded border p-4 flex flex-col justify-between ${
                stage.status === 'warning'
                  ? 'bg-neutral-900 border-white'
                  : 'bg-neutral-950 border-neutral-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="text-neutral-400">
                    STAGE 0{stage.stageIndex} · {stage.phase.toUpperCase()}
                  </span>
                  <span className="text-white flex items-center gap-1 font-semibold">
                    {stage.status === 'warning' ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        WARNING
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {stage.durationMs} ms
                      </>
                    )}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white">{stage.title}</h3>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  {stage.detail}
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-neutral-800">
                <code className="text-[11px] font-mono text-neutral-300 block truncate">
                  {stage.registerDump}
                </code>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 06: Automated System Rollback Utility & Kernel Log Analyzer */}
      <section
        id="rollback-recovery"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* Left 6 Cols: Automated System Rollback Utility */}
        <div className="lg:col-span-6 bg-[#111111] border border-neutral-800 rounded-lg p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
            <div>
              <div className="text-xs font-mono text-neutral-400 flex items-center gap-2 whitespace-nowrap">
                <span>FAIL-SAFE OPENCORE EFI RECOVERY</span>
                <span aria-hidden="true">·</span>
                <span className="text-white">WATCHDOG ARMED</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                06. Automated EFI Rollback &amp; Recovery Utility
              </h2>
            </div>

            <button
              type="button"
              onClick={onEmergencyBaselineRevert}
              className="px-3.5 py-2 rounded bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Revert to Working NullMoth dGPU Setup
            </button>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">
            Your working standalone <strong className="text-white">NullMoth 1401 RTX 2050 dGPU-only</strong> EFI partition is preserved with SHA-256 verification. If <code className="font-mono text-neutral-200">WhateverXeADL.kext</code> encounters a display link training error, press Spacebar at the OpenCore boot picker or click <strong className="text-white">Revert to Working NullMoth dGPU Setup</strong> to restore your exact pre-driver state.
          </p>

          {/* Create New Snapshot Form */}
          <form onSubmit={handleCreateSnapshotSubmit} className="space-y-2">
            <label
              htmlFor="new-snapshot-input"
              className="block text-xs font-medium text-neutral-300"
            >
              Create Verified OpenCore EFI Snapshot
            </label>
            <div className="flex gap-2">
              <input
                id="new-snapshot-input"
                type="text"
                value={newSnapshotName}
                onChange={(e) => setNewSnapshotName(e.target.value)}
                placeholder="e.g. Pre-144Hz Backlight Tune Snapshot"
                className="flex-1 px-3 py-2 rounded bg-neutral-950 border border-neutral-700 text-xs text-white focus:outline-none focus:border-white"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Snapshot
              </button>
            </div>
            {snapshotError && (
              <p role="alert" className="text-xs text-white font-semibold">
                {snapshotError}
              </p>
            )}
          </form>

          {/* Snapshot List */}
          <div className="space-y-2.5">
            {snapshots.map((snap) => {
              const isCurrent = snap.id === activeSnapshotId;
              return (
                <div
                  key={snap.id}
                  className={`p-3.5 rounded border transition-colors ${
                    isCurrent
                      ? 'bg-neutral-900 border-white'
                      : 'bg-neutral-950 border-neutral-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        {snap.label}
                      </span>
                      <div className="text-[11px] text-neutral-400 mt-1 flex flex-wrap items-center gap-2 font-mono tabular-nums">
                        <span>{snap.createdAt}</span>
                        <span aria-hidden="true">·</span>
                        <span>SHA256: {snap.sha256Short}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-neutral-200">{snap.muxMode}</span>
                      </div>
                      <code className="text-[11px] font-mono text-neutral-400 block mt-1.5 truncate max-w-md">
                        boot-args: {snap.bootArgs}
                      </code>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRestoreSnapshot(snap)}
                      disabled={isCurrent}
                      className={`px-3 py-1.5 rounded text-xs font-mono transition-colors whitespace-nowrap shrink-0 ${
                        isCurrent
                          ? 'bg-white text-neutral-950 font-semibold cursor-default'
                          : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700'
                      }`}
                    >
                      {isCurrent ? 'Active EFI' : `Restore ${snap.sha256Short.slice(0, 6)}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 6 Cols: Kernel Stability & IOGraphics Error Reporting Console */}
        <div className="lg:col-span-6 bg-[#111111] border border-neutral-800 rounded-lg p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-800 pb-4">
            <div>
              <div className="text-xs font-mono text-neutral-400 flex items-center gap-2">
                <span>LILU / IOKIT RING BUFFER</span>
                <span aria-hidden="true">·</span>
                <span className="text-white">0 KERNEL PANICS</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                Kernel Stability &amp; Diagnostic Log Stream
              </h2>
            </div>

            <select
              aria-label="Filter logs by kernel subsystem"
              value={logFilterSubsystem}
              onChange={(e) => setLogFilterSubsystem(e.target.value)}
              className="px-2.5 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-xs font-mono text-neutral-200"
            >
              <option value="ALL">All Subsystems ({kernelLogs.length})</option>
              <option value="WhateverXeADL">WhateverXeADL</option>
              <option value="NullMothBridge">NullMothBridge</option>
              <option value="AppleACPIMux">AppleACPIMux</option>
              <option value="IOGraphics">IOGraphics</option>
              <option value="IOPMrootDomain">IOPMrootDomain</option>
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              aria-label="Search kernel logs"
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
              placeholder="Search register dumps, PCI IDs (e.g. 46A3, D3cold, PORT-BUG)..."
              className="w-full pl-8 pr-3 py-2 rounded bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-white"
            />
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded divide-y divide-neutral-800 max-h-[360px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400">
                No kernel log entries match your current filter.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="p-3 text-xs space-y-1 hover:bg-neutral-900/60">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500 tabular-nums">{log.timestamp}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-white font-semibold">{log.subsystem}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-neutral-300">{log.severity}</span>
                    </div>
                    <code className="text-neutral-400">{log.registerCode}</code>
                  </div>
                  <p className="text-neutral-200 leading-snug">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
