'use client';

import React from 'react';
import {
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import {
  DriverConfig,
  MuxMode,
  TelemetrySnapshot,
} from '@/lib/driver-engine';

interface MuxTelemetryDashboardProps {
  muxMode: MuxMode;
  onSelectMuxMode: (mode: MuxMode) => void;
  config: DriverConfig;
  telemetry: TelemetrySnapshot;
  workloadIntensity: number;
  onChangeWorkload: (val: number) => void;
  onNavigateSection: (section: string) => void;
}

export default function MuxTelemetryDashboard({
  muxMode,
  onSelectMuxMode,
  config,
  telemetry,
  workloadIntensity,
  onChangeWorkload,
  onNavigateSection,
}: MuxTelemetryDashboardProps) {
  const hours = Math.floor(telemetry.estimatedBatteryMinutes / 60);
  const mins = telemetry.estimatedBatteryMinutes % 60;

  return (
    <section id="telemetry-mux" className="space-y-5">
      {/* NullMoth 1401 Monochrome Control Panel */}
      <div className="bg-[#111111] border border-neutral-800 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-5 border-b border-neutral-800">
          <div>
            <div className="text-xs text-neutral-400 flex items-center gap-2 font-mono">
              <span>NULLMOTH 1401 IOKIT BRIDGE</span>
              <span aria-hidden="true">·</span>
              <span className="text-neutral-200">8086:46A3 + 10DE:25A5</span>
              <span aria-hidden="true">·</span>
              <span>PS8461E MUX</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white mt-1">
              01. Hardware Multiplexer &amp; Silicon Telemetry
            </h2>
          </div>

          {/* Monochrome 3-Mode Segmented Control */}
          <div
            role="group"
            aria-label="Select GPU MUX Operating Mode"
            className="flex flex-wrap sm:flex-nowrap items-center gap-1 bg-neutral-950 p-1 rounded border border-neutral-800"
          >
            <button
              type="button"
              onClick={() => onSelectMuxMode('hybrid_mux')}
              className={`px-3.5 py-1.5 rounded text-xs font-mono font-medium transition-colors whitespace-nowrap shrink-0 ${
                muxMode === 'hybrid_mux'
                  ? 'bg-white text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Mode 1: Hybrid MUX
            </button>
            <button
              type="button"
              onClick={() => onSelectMuxMode('igpu_eco')}
              className={`px-3.5 py-1.5 rounded text-xs font-mono font-medium transition-colors whitespace-nowrap shrink-0 ${
                muxMode === 'igpu_eco'
                  ? 'bg-white text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Mode 0: iGPU Eco (48EU)
            </button>
            <button
              type="button"
              onClick={() => onSelectMuxMode('dgpu_only')}
              className={`px-3.5 py-1.5 rounded text-xs font-mono font-medium transition-colors whitespace-nowrap shrink-0 ${
                muxMode === 'dgpu_only'
                  ? 'bg-white text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Mode 2: dGPU Locked
            </button>
          </div>
        </div>

        {/* Workload Simulator & Hairline KPI Strip */}
        <div className="pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 pr-0 lg:pr-4">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="workload-slider"
                className="text-xs font-medium text-neutral-200 flex items-center gap-2"
              >
                <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                Simulated Metal 3 / WindowServer Load
              </label>
              <span className="font-mono text-xs font-semibold text-white tabular-nums">
                {workloadIntensity}%
              </span>
            </div>
            <input
              id="workload-slider"
              type="range"
              min={5}
              max={100}
              step={1}
              value={workloadIntensity}
              onChange={(e) => onChangeWorkload(Number(e.target.value))}
              className="w-full accent-white cursor-pointer h-1.5 bg-neutral-800 rounded"
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mt-2">
              <span>5% Idle</span>
              <span>55% dGPU Wake</span>
              <span>100% Compute</span>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800 border-t lg:border-t-0 lg:border-l border-neutral-800 pt-4 lg:pt-0 lg:pl-6">
            <div className="py-2 sm:py-0 sm:px-3 first:pl-0">
              <span className="text-[11px] font-mono text-neutral-400 block">PACKAGE POWER</span>
              <span className="font-mono text-xl font-bold text-white tabular-nums mt-1 block">
                {telemetry.totalGpuPackagePowerW.toFixed(1)} W
              </span>
              <span className="text-[11px] text-neutral-500 mt-0.5 block">
                {muxMode === 'dgpu_only' ? 'dGPU rail locked' : 'D3cold power gate'}
              </span>
            </div>

            <div className="py-2 sm:py-0 sm:px-3">
              <span className="text-[11px] font-mono text-neutral-400 block">BATTERY EST.</span>
              <span className="font-mono text-xl font-bold text-white tabular-nums mt-1 block">
                {hours}h {mins.toString().padStart(2, '0')}m
              </span>
              <span className="text-[11px] text-neutral-500 mt-0.5 block">
                58Wh 4-Cell Li-Ion
              </span>
            </div>

            <div className="py-2 sm:py-0 sm:px-3">
              <span className="text-[11px] font-mono text-neutral-400 block">SCANOUT PIPE</span>
              <span className="font-mono text-xl font-bold text-white tabular-nums mt-1 block">
                {telemetry.windowServerFps} Hz
              </span>
              <span className="text-[11px] text-neutral-500 mt-0.5 block font-mono tabular-nums">
                {telemetry.metal3ShaderLatencyMs} ms shader
              </span>
            </div>

            <div className="py-2 sm:py-0 sm:pl-3">
              <span className="text-[11px] font-mono text-neutral-400 block">DMA-BUF PEER</span>
              <span className="font-mono text-xl font-bold text-white tabular-nums mt-1 block">
                {telemetry.dmaBufBandwidthGbs.toFixed(1)} GB/s
              </span>
              <span className="text-[11px] text-neutral-500 mt-0.5 block">
                PCIe 4.0 x8
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Monochrome Hardware Topology Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Intel Core i5-12450HX UHD Graphics 48EU */}
        <div className="lg:col-span-4 bg-[#111111] border border-neutral-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 font-mono">
              <span>PciRoot(0x0)/Pci(0x2,0x0)</span>
              <span className="text-white font-semibold">{telemetry.igpuState}</span>
            </div>
            <h3 className="text-base font-bold text-white">
              Intel UHD Graphics (i5-12450HX)
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Alder Lake-HX GT1 · 48 EU · Device <code className="text-neutral-200">0x46A3</code> · WhateverXeADL 1.8.4
            </p>

            <dl className="mt-4 space-y-2 text-xs border-t border-neutral-800 pt-3.5">
              <div className="flex items-center justify-between">
                <dt className="text-neutral-400">Core Clock / EU Load</dt>
                <dd className="font-mono text-neutral-100 tabular-nums">
                  {telemetry.igpuClockMhz} MHz · {telemetry.igpuUtilizationPct}%
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-neutral-400">Power Draw / Die Temp</dt>
                <dd className="font-mono text-neutral-100 tabular-nums">
                  {telemetry.igpuPowerW.toFixed(1)} W · {telemetry.igpuTempC}°C
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-neutral-400">Unified Metal 3 VRAM</dt>
                <dd className="font-mono text-neutral-100 tabular-nums">
                  {telemetry.igpuVramAllocatedMb} MB (DVMT {config.stolenMemoryMb}M)
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-neutral-400">GuC / HuC Microcode</dt>
                <dd className="font-mono text-neutral-200">
                  {config.enableGuCFirmware ? 'adl_guc_70.5.1 (OK)' : 'Host Ring Fallback'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-500">AAPL,ig-platform-id</span>
            <span className="text-neutral-200">{config.igPlatformIdHex}</span>
          </div>
        </div>

        {/* Center: Monochrome PS8461E Hardware eDP MUX Switch Schematic */}
        <div className="lg:col-span-4 bg-[#111111] border border-neutral-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 font-mono">
              <span>ACPI \_SB.PCI0.XMUX</span>
              <span className="text-neutral-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                VBlank Locked
              </span>
            </div>
            <h3 className="text-base font-bold text-white">
              PS8461E eDP 1.4b Multiplexer
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Hardware display switch with DP AUX fast link retrain &amp; DMA-BUF peer
            </p>

            <div
              data-testid="mux-schematic-svg"
              className="mt-4 bg-neutral-950 border border-neutral-800 rounded p-3"
            >
              <svg
                viewBox="0 0 320 155"
                className="w-full h-36"
                role="img"
                aria-label={`Hardware MUX schematic currently routing via ${telemetry.edpMuxRoute}`}
              >
                {/* Intel iGPU Node */}
                <rect
                  x="10"
                  y="14"
                  width="92"
                  height="48"
                  rx="4"
                  fill={muxMode !== 'dgpu_only' ? '#262626' : '#141414'}
                  stroke={muxMode !== 'dgpu_only' ? '#ffffff' : '#404040'}
                  strokeWidth="1.5"
                />
                <text x="20" y="34" fill="#fafafa" fontSize="10" fontWeight="600">
                  UHD 0x46A3
                </text>
                <text x="20" y="48" fill="#a3a3a3" fontSize="8.5" fontFamily="monospace">
                  48EU · {telemetry.igpuPowerW}W
                </text>

                {/* RTX 2050 Node */}
                <rect
                  x="10"
                  y="92"
                  width="92"
                  height="48"
                  rx="4"
                  fill={telemetry.dgpuState !== 'D3cold Power-Gated' ? '#262626' : '#141414'}
                  stroke={telemetry.dgpuState !== 'D3cold Power-Gated' ? '#ffffff' : '#404040'}
                  strokeWidth="1.5"
                />
                <text x="20" y="112" fill="#fafafa" fontSize="10" fontWeight="600">
                  RTX 2050 4G
                </text>
                <text x="20" y="126" fill="#a3a3a3" fontSize="8.5" fontFamily="monospace">
                  {telemetry.dgpuState === 'D3cold Power-Gated'
                    ? 'D3cold · 0.0W'
                    : `D0 · ${telemetry.dgpuPowerW}W`}
                </text>

                {/* DMA-BUF Peer Bridge Vertical Line */}
                <line
                  x1="56"
                  y1="62"
                  x2="56"
                  y2="92"
                  stroke={muxMode === 'hybrid_mux' ? '#ffffff' : '#404040'}
                  strokeWidth="1.75"
                  strokeDasharray={muxMode === 'hybrid_mux' ? '3 2' : 'none'}
                />

                {/* Traces to MUX Switch */}
                <path
                  d="M 102 38 L 148 68"
                  stroke={muxMode !== 'dgpu_only' ? '#ffffff' : '#404040'}
                  strokeWidth={muxMode !== 'dgpu_only' ? '2.25' : '1.25'}
                  fill="none"
                />
                <path
                  d="M 102 116 L 148 86"
                  stroke={muxMode === 'dgpu_only' ? '#ffffff' : '#404040'}
                  strokeWidth={muxMode === 'dgpu_only' ? '2.25' : '1.25'}
                  fill="none"
                />

                {/* Central MUX Switch IC */}
                <rect
                  x="148"
                  y="54"
                  width="64"
                  height="46"
                  rx="4"
                  fill="#171717"
                  stroke="#a3a3a3"
                  strokeWidth="1.5"
                />
                <text x="157" y="74" fill="#fafafa" fontSize="9.5" fontWeight="600">
                  PS8461E
                </text>
                <text x="157" y="88" fill="#d4d4d4" fontSize="8" fontFamily="monospace">
                  MUX 1401
                </text>

                {/* Output Trace to 144Hz Display */}
                <line
                  x1="212"
                  y1="77"
                  x2="238"
                  y2="77"
                  stroke="#ffffff"
                  strokeWidth="2.25"
                />

                {/* Internal 144Hz eDP Display */}
                <rect
                  x="238"
                  y="48"
                  width="72"
                  height="58"
                  rx="4"
                  fill="#171717"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <text x="247" y="70" fill="#fafafa" fontSize="9.5" fontWeight="600">
                  eDP 1.4b
                </text>
                <text x="247" y="84" fill="#e5e5e5" fontSize="8.5" fontFamily="monospace">
                  {telemetry.windowServerFps}Hz Pipe
                </text>
                <text x="247" y="96" fill="#a3a3a3" fontSize="7.5">
                  Tahoe 25.1
                </text>
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-500">Route</span>
            <span className="text-neutral-200 truncate max-w-[210px]">
              {telemetry.edpMuxRoute}
            </span>
          </div>
        </div>

        {/* Right: NVIDIA GeForce RTX 2050 (NullMoth 1401 Peer) */}
        <div className="lg:col-span-4 bg-[#111111] border border-neutral-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 font-mono">
              <span>PciRoot(0x0)/Pci(0x1,0x0)</span>
              <span className="text-white font-semibold">{telemetry.dgpuState}</span>
            </div>
            <h3 className="text-base font-bold text-white">
              NVIDIA GeForce RTX 2050 (4GB)
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Ampere GA107M · Device <code className="text-neutral-200">10DE:25A5</code> · NullMoth 1401 Coexistence
            </p>

            <dl className="mt-4 space-y-2 text-xs border-t border-neutral-800 pt-3.5">
              <div className="flex items-center justify-between">
                <dt className="text-neutral-400">Core Clock / Load</dt>
                <dd className="font-mono text-neutral-100 tabular-nums">
                  {telemetry.dgpuClockMhz} MHz · {telemetry.dgpuUtilizationPct}%
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-neutral-400">Board Power / Temp</dt>
                <dd className="font-mono text-neutral-100 tabular-nums">
                  {telemetry.dgpuPowerW.toFixed(1)} W · {telemetry.dgpuTempC}°C
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-neutral-400">GDDR6 Dedicated VRAM</dt>
                <dd className="font-mono text-neutral-100 tabular-nums">
                  {telemetry.dgpuVramUsedMb} / 4096 MB
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-neutral-400">ACPI Power Method</dt>
                <dd className="font-mono text-neutral-200">
                  {telemetry.dgpuState === 'D3cold Power-Gated'
                    ? 'PEGP._OFF (0.0W)'
                    : 'PEGP._ON (Active)'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-500 font-mono">Port Stability</span>
            <button
              type="button"
              onClick={() => onNavigateSection('port-stability')}
              className="text-white hover:text-neutral-300 font-mono underline underline-offset-4"
            >
              Verify 10/10 Port Checks
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
