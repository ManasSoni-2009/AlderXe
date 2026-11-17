'use client';

import React from 'react';
import {
  Cpu,
  ShieldAlert,
  Moon,
  Layers,
  Check,
  X,
  Monitor,
} from 'lucide-react';
import {
  DriverConfig,
  MuxMode,
  TahaoGlassProfile,
  TelemetrySnapshot,
} from '@/lib/driver-engine';

interface TahoeMenuBarPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  muxMode: MuxMode;
  onSelectMuxMode: (mode: MuxMode) => void;
  config: DriverConfig;
  onUpdateConfig: (partial: Partial<DriverConfig>) => void;
  telemetry: TelemetrySnapshot;
  onTriggerSleepCycle: () => void;
  onEmergencyRollback: () => void;
}

export default function TahoeMenuBarPopover({
  isOpen,
  onClose,
  muxMode,
  onSelectMuxMode,
  config,
  onUpdateConfig,
  telemetry,
  onTriggerSleepCycle,
  onEmergencyRollback,
}: TahoeMenuBarPopoverProps) {
  if (!isOpen) return null;

  const modes: {
    id: MuxMode;
    label: string;
    sub: string;
    powerBadge: string;
  }[] = [
    {
      id: 'hybrid_mux',
      label: 'Mode 1 · Hybrid Metal 3 MUX (Recommended)',
      sub: 'UHD 0x46A3 scanout · RTX 2050 D3cold (0W) until 3D load',
      powerBadge: 'Dynamic',
    },
    {
      id: 'igpu_eco',
      label: 'Mode 0 · iGPU Eco (Alder Lake 48EU)',
      sub: 'RTX 2050 ACPI _OFF (0.0W) · Maximum battery runtime',
      powerBadge: '0.0W dGPU',
    },
    {
      id: 'dgpu_only',
      label: 'Mode 2 · dGPU Locked (NullMoth 1401)',
      sub: 'Standalone RTX 2050 direct eDP · iGPU bypassed',
      powerBadge: 'Direct',
    },
  ];

  const glassProfiles: { id: TahaoGlassProfile; label: string }[] = [
    { id: 'full_refraction', label: 'Full (3-Pass)' },
    { id: 'balanced_vibrancy', label: 'Balanced' },
    { id: 'low_latency_opaque', label: 'Low-Latency' },
  ];

  const hours = Math.floor(telemetry.estimatedBatteryMinutes / 60);
  const mins = telemetry.estimatedBatteryMinutes % 60;

  return (
    <div
      role="dialog"
      aria-label="NullMoth 1401 Menu Bar Controller"
      className="fixed right-6 top-16 z-50 w-[420px] max-w-[calc(100vw-2rem)] rounded-lg border border-neutral-800 tahoe-popover p-4 shadow-2xl text-neutral-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-neutral-300" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-white">
              NULLMOTH 1401 · MENU BAR AGENT
            </span>
          </div>
          <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
            Build 1401-Tahoe · WhateverXeADL 1.8.4 + IOKit Bridge
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Menu Bar Controller"
          className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Live Power & Display Strip */}
      <div className="grid grid-cols-3 divide-x divide-neutral-800 py-3 border-b border-neutral-800 text-xs">
        <div className="pr-3">
          <span className="text-neutral-500 block text-[11px]">Package Draw</span>
          <span className="font-mono text-sm font-semibold text-white tabular-nums mt-0.5 block">
            {telemetry.totalGpuPackagePowerW.toFixed(1)} W
          </span>
        </div>
        <div className="px-3">
          <span className="text-neutral-500 block text-[11px]">Est. Battery</span>
          <span className="font-mono text-sm font-semibold text-white tabular-nums mt-0.5 block">
            {hours}h {mins.toString().padStart(2, '0')}m
          </span>
        </div>
        <div className="pl-3">
          <span className="text-neutral-500 block text-[11px]">Scanout Rate</span>
          <span className="font-mono text-sm font-semibold text-white tabular-nums mt-0.5 block">
            {telemetry.windowServerFps} FPS
          </span>
        </div>
      </div>

      {/* GPU MUX Mode Selector */}
      <div className="py-3 border-b border-neutral-800">
        <span className="text-[11px] font-mono text-neutral-400 block mb-2">
          PS8461E Hardware eDP Multiplexer
        </span>
        <div className="space-y-1.5">
          {modes.map((item) => {
            const active = muxMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectMuxMode(item.id)}
                className={`w-full text-left p-2.5 rounded border transition-colors flex items-start justify-between gap-2 ${
                  active
                    ? 'bg-neutral-100 border-white text-neutral-950'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-200 hover:bg-neutral-800/80'
                }`}
              >
                <div className="min-w-0">
                  <span className="text-xs font-semibold block truncate">
                    {item.label}
                  </span>
                  <p
                    className={`text-[11px] mt-0.5 leading-snug ${
                      active ? 'text-neutral-700' : 'text-neutral-400'
                    }`}
                  >
                    {item.sub}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[11px] font-mono ${
                      active ? 'text-neutral-800 font-semibold' : 'text-neutral-400'
                    }`}
                  >
                    {item.powerBadge}
                  </span>
                  {active && <Check className="w-4 h-4 text-neutral-950 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Liquid Glass Compositor Preset */}
      <div className="py-3 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            Tahoe Liquid Glass SIMD16 Shader
          </span>
          <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
            {telemetry.metal3ShaderLatencyMs} ms
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded border border-neutral-800">
          {glassProfiles.map((prof) => (
            <button
              key={prof.id}
              type="button"
              onClick={() => onUpdateConfig({ glassProfile: prof.id })}
              className={`px-2 py-1.5 rounded text-[11px] font-medium transition-colors truncate ${
                config.glassProfile === prof.id
                  ? 'bg-white text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {prof.label}
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className="text-neutral-300 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-neutral-400" />
            144Hz eDP VBlank Lock
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={config.edidOverride144Hz}
            aria-label="Toggle 144Hz eDP VBlank Lock"
            onClick={() => onUpdateConfig({ edidOverride144Hz: !config.edidOverride144Hz })}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
              config.edidOverride144Hz
                ? 'bg-white text-neutral-950 border-white font-semibold'
                : 'bg-neutral-900 text-neutral-400 border-neutral-700'
            }`}
          >
            {config.edidOverride144Hz ? '144Hz Locked' : '60Hz Standard'}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={onTriggerSleepCycle}
          className="w-full py-2 px-3 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
        >
          <Moon className="w-3.5 h-3.5 text-neutral-300" />
          Run S0ix Sleep &amp; Wake Self-Test
        </button>
        <button
          type="button"
          onClick={onEmergencyRollback}
          className="w-full py-2 px-3 rounded bg-neutral-950 hover:bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-neutral-300" />
          Revert to Working NullMoth 1401 dGPU Baseline
        </button>
      </div>
    </div>
  );
}
