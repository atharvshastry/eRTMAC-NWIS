import React from 'react';
import { Database, MapPin, Layers, Gauge } from 'lucide-react';

export default function ActiveWellCard({
  wellName = 'OIL-DEMO-001',
  status = 'LIVE',
  currentDepth = '2,845 m',
  formation = 'Demo Formation',
  field = 'Demo Field',
}) {
  return (
    <div className="bg-[#101012] border border-white/[0.08] hover:border-white/[0.14] rounded-[22px] p-6 text-zinc-200 transition-all duration-200">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Active Well ID & Status */}
        <div className="flex items-center gap-3.5">
          <div className="icon-squircle">
            <Database className="w-5 h-5 text-zinc-200" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                Active Well
              </span>
              <div className="badge-emerald">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{status}</span>
              </div>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white font-mono tracking-tight">
              {wellName}
            </h2>
          </div>
        </div>

        {/* Right: Operational Telemetry Fields */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/[0.06] text-xs">
          {/* Current Depth */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <Gauge className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <span className="text-[10px] text-zinc-500 block leading-tight">
                Current Depth
              </span>
              <span className="text-xs sm:text-sm font-bold text-white font-mono">
                {currentDepth}
              </span>
            </div>
          </div>

          {/* Formation */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <Layers className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <span className="text-[10px] text-zinc-500 block leading-tight">
                Formation
              </span>
              <span className="text-xs sm:text-sm font-semibold text-zinc-200 truncate block">
                {formation}
              </span>
            </div>
          </div>

          {/* Field */}
          <div className="col-span-2 sm:col-span-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <span className="text-[10px] text-zinc-500 block leading-tight">
                Field
              </span>
              <span className="text-xs sm:text-sm font-semibold text-zinc-200 truncate block">
                {field}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
