'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Wrench,
} from 'lucide-react';
import {
  DEFAULT_DRIVER_CONFIG,
  DriverConfig,
  MuxMode,
  validateDriverConfig,
  generateOpenCoreConfigPlist,
  generateKextSourceFiles,
  mbToLittleEndianHex,
  buildBootArgs,
} from '@/lib/driver-engine';

interface KextAndPlistStudioProps {
  config: DriverConfig;
  muxMode: MuxMode;
  onApplyValidConfig: (newConfig: DriverConfig) => void;
}

export default function KextAndPlistStudio({
  config,
  muxMode,
  onApplyValidConfig,
}: KextAndPlistStudioProps) {
  const [draft, setDraft] = useState<DriverConfig>(config);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [rebuildSuccessMsg, setRebuildSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('config.plist');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const kextFiles = generateKextSourceFiles(config, muxMode);
  const plistXml = generateOpenCoreConfigPlist(config, muxMode);

  const allArtifacts = [
    {
      filename: 'config.plist',
      path: 'EFI/OC/config.plist (Patch)',
      language: 'xml',
      description:
        'OpenCore 1.0.3+ configuration dictionary injecting PciRoot(0x0)/Pci(0x2,0x0) Alder Lake 0x46A3 properties, NullMoth 1401 RTX 2050 DMA-BUF peer flags, and Kernel kext load order.',
      linesOfCode: plistXml.split('\n').length,
      content: plistXml,
    },
    ...kextFiles,
  ];

  const currentArtifact =
    allArtifacts.find((a) => a.filename === activeTab) || allArtifacts[0];

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateDriverConfig(draft);
    if (!result.valid) {
      setValidationErrors(result.errors);
      setRebuildSuccessMsg(null);
      return;
    }

    setValidationErrors({});
    const normalized: DriverConfig = {
      ...draft,
      deviceIdHex: draft.deviceIdHex.trim().toUpperCase(),
      igPlatformIdHex: draft.igPlatformIdHex.trim().toUpperCase(),
      spoofedTargetHex: draft.spoofedTargetHex.trim().toUpperCase(),
    };
    onApplyValidConfig(normalized);
    setRebuildSuccessMsg(
      `Rebuilt WhateverXeADL.kext & OpenCore config.plist for Device ID ${normalized.deviceIdHex} (${normalized.vramUnifiedMb} MB Unified Metal 3 VRAM).`
    );
  };

  const handleResetDefaults = () => {
    setDraft(DEFAULT_DRIVER_CONFIG);
    setValidationErrors({});
    onApplyValidConfig(DEFAULT_DRIVER_CONFIG);
    setRebuildSuccessMsg('Restored verified NullMoth 1401 + i5-12450HX Hybrid Metal 3 settings.');
  };

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentArtifact.content).catch(() => {});
    }
    setCopiedTab(currentArtifact.filename);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([currentArtifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentArtifact.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="kext-studio" className="space-y-6">
      <div className="bg-[#111111] border border-neutral-800 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-neutral-800">
          <div>
            <div className="text-xs font-mono text-neutral-400 flex items-center gap-2">
              <span>LILU + WHATEVERGREEN / WHATEVERXE KERNEL PATCHER</span>
              <span aria-hidden="true">·</span>
              <span className="text-neutral-200">DARWIN 25.X</span>
              <span aria-hidden="true">·</span>
              <span>GUC V70.5.1</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white mt-1">
              04. Kext Driver Builder &amp; OpenCore <code className="text-neutral-200 font-mono">config.plist</code> Generator
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-neutral-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to i5-12450HX Defaults
            </button>
          </div>
        </div>

        <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 Cols: Hardware Framebuffer & Kext Parameter Form */}
          <form
            onSubmit={handleApplySubmit}
            noValidate
            className="lg:col-span-5 bg-neutral-950 border border-neutral-800 rounded p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-neutral-300" />
                Alder Lake-HX Framebuffer &amp; MUX Parameters
              </h3>
              <span className="text-xs font-mono text-neutral-400">8086:46A3</span>
            </div>

            {Object.keys(validationErrors).length > 0 && (
              <div
                role="alert"
                className="p-3.5 rounded bg-neutral-900 border border-white text-neutral-100 text-xs space-y-1"
              >
                <div className="font-semibold flex items-center gap-1.5 text-white">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Configuration Validation Failed
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-neutral-300">
                  {Object.values(validationErrors).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {rebuildSuccessMsg && Object.keys(validationErrors).length === 0 && (
              <div
                role="status"
                className="p-3 rounded bg-neutral-900 border border-neutral-700 text-neutral-100 text-xs flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <span>{rebuildSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="input-device-id"
                  className="block text-xs font-medium text-neutral-300 mb-1"
                >
                  PCI Device ID (Little-Endian Hex)
                </label>
                <input
                  id="input-device-id"
                  type="text"
                  value={draft.deviceIdHex}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, deviceIdHex: e.target.value }))
                  }
                  placeholder="A3460000"
                  className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-white"
                />
                <span className="text-[11px] text-neutral-500 mt-0.5 block">
                  i5-12450HX native: <code className="text-neutral-300">A3460000</code>
                </span>
              </div>

              <div>
                <label
                  htmlFor="input-platform-id"
                  className="block text-xs font-medium text-neutral-300 mb-1"
                >
                  AAPL,ig-platform-id (Hex)
                </label>
                <input
                  id="input-platform-id"
                  type="text"
                  value={draft.igPlatformIdHex}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, igPlatformIdHex: e.target.value }))
                  }
                  placeholder="07009B3E"
                  className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-white"
                />
                <span className="text-[11px] text-neutral-500 mt-0.5 block">
                  3-Pipe eDP+HDMI: <code className="text-neutral-300">07009B3E</code>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="select-stolen-mem"
                  className="block text-xs font-medium text-neutral-300 mb-1"
                >
                  DVMT Stolen (MB)
                </label>
                <select
                  id="select-stolen-mem"
                  value={draft.stolenMemoryMb}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      stolenMemoryMb: Number(e.target.value),
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded bg-neutral-900 border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-white"
                >
                  <option value={32}>32 MB ({mbToLittleEndianHex(32)})</option>
                  <option value={64}>64 MB ({mbToLittleEndianHex(64)})</option>
                  <option value={96}>96 MB ({mbToLittleEndianHex(96)})</option>
                  <option value={128}>128 MB ({mbToLittleEndianHex(128)})</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="select-unified-vram"
                  className="block text-xs font-medium text-neutral-300 mb-1"
                >
                  Unified VRAM (MB)
                </label>
                <select
                  id="select-unified-vram"
                  value={draft.vramUnifiedMb}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      vramUnifiedMb: Number(e.target.value),
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded bg-neutral-900 border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-white"
                >
                  <option value={1536}>1536 MB (1.5 GB)</option>
                  <option value={2048}>2048 MB (2.0 GB)</option>
                  <option value={3072}>3072 MB (3.0 GB)</option>
                  <option value={4096}>4096 MB (4.0 GB)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="input-pwm-freq"
                  className="block text-xs font-medium text-neutral-300 mb-1"
                >
                  Backlight PWM (Hz)
                </label>
                <input
                  id="input-pwm-freq"
                  type="number"
                  value={draft.pwmBacklightFreqHz}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      pwmBacklightFreqHz: Number(e.target.value),
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded bg-neutral-900 border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-neutral-800 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.enableGuCFirmware}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, enableGuCFirmware: e.target.checked }))
                  }
                  className="mt-0.5 accent-white rounded"
                />
                <span>
                  <strong className="text-neutral-100 block">
                    Inject Apple-Signed GuC v70.5.1 &amp; HuC v7.9.3 Firmware
                  </strong>
                  <span className="text-neutral-400">
                    Fixes PORT-BUG-02: Asserts FORCEWAKE_MT before loading microcode into 64MB DVMT.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.enableTahoeLiquidGlass}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      enableTahoeLiquidGlass: e.target.checked,
                    }))
                  }
                  className="mt-0.5 accent-white rounded"
                />
                <span>
                  <strong className="text-neutral-100 block">
                    macOS Tahoe Liquid Glass Metal 3 Dual-SIMD16 Shader Shim
                  </strong>
                  <span className="text-neutral-400">
                    Fixes PORT-BUG-04: Lowers SkyLight SIMD32 refraction kernels to 48EU GT1 subslices.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.dmaBufZeroCopyBridge}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      dmaBufZeroCopyBridge: e.target.checked,
                    }))
                  }
                  className="mt-0.5 accent-white rounded"
                />
                <span>
                  <strong className="text-neutral-100 block">
                    NullMoth 1401 RTX 2050 Zero-Copy IOSurface DMA-BUF Bridge
                  </strong>
                  <span className="text-neutral-400">
                    Fixes PORT-BUG-05: Binds IOMMU peer mapping between RTX 2050 and UHD 0x46A3.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.enableRtxD3ColdPowerGate}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      enableRtxD3ColdPowerGate: e.target.checked,
                    }))
                  }
                  className="mt-0.5 accent-white rounded"
                />
                <span>
                  <strong className="text-neutral-100 block">
                    ACPI <code className="font-mono">\_SB.PCI0.PEG0.PEGP._OFF</code> D3cold Power Gate
                  </strong>
                  <span className="text-neutral-400">
                    Fixes PORT-BUG-09: Isolates RTX 2050 rail to 0.0W when idle in Hybrid or iGPU mode.
                  </span>
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs transition-colors whitespace-nowrap"
              >
                Apply &amp; Rebuild Kext + OpenCore Plist
              </button>
            </div>
          </form>

          {/* Right 7 Cols: Live Generated Code & Plist Viewer */}
          <div className="lg:col-span-7 bg-neutral-950 border border-neutral-800 rounded overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-2 px-4 py-3 bg-neutral-900 border-b border-neutral-800 overflow-x-auto">
              <div role="tablist" aria-label="Driver and OpenCore source files" className="flex items-center gap-1.5">
                {allArtifacts.map((file) => {
                  const isSelected = file.filename === currentArtifact.filename;
                  return (
                    <button
                      key={file.filename}
                      role="tab"
                      aria-selected={isSelected}
                      type="button"
                      onClick={() => setActiveTab(file.filename)}
                      className={`px-3 py-1.5 rounded text-xs font-mono transition-colors whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-white text-neutral-950 font-semibold'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      {file.filename}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  {copiedTab === currentArtifact.filename ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy File
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadFile}
                  className="px-2.5 py-1.5 rounded bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            </div>

            <div className="px-4 py-2.5 bg-neutral-900/50 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
              <span>{currentArtifact.description}</span>
              <span className="font-mono text-neutral-300 shrink-0 tabular-nums">
                {currentArtifact.path} · {currentArtifact.linesOfCode} lines
              </span>
            </div>

            <div className="px-4 py-2 bg-neutral-900/80 border-b border-neutral-800 flex items-center justify-between gap-4 text-xs">
              <span className="text-neutral-400 font-mono shrink-0">NVRAM boot-args:</span>
              <code className="font-mono text-white truncate">
                {buildBootArgs(config, muxMode)}
              </code>
            </div>

            <div className="p-4 overflow-x-auto max-h-[460px] overflow-y-auto">
              <pre className="text-xs font-mono leading-relaxed text-neutral-200 tabular-nums">
                <code>{currentArtifact.content}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
