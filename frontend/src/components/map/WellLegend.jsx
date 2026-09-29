import React from 'react';

export default function WellLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 p-2 px-3 rounded-sm bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
      <span className="text-slate-500 font-semibold uppercase text-[10px]">LEGEND:</span>
      
      {/* Active Well */}
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/30"></span>
        <span className="text-slate-200">Active Well (OIL-DEMO-001)</span>
      </div>

      {/* Normal Historical Well */}
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span className="text-slate-300">Normal Historical Well</span>
      </div>

      {/* Historical Risk */}
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red-500"></span>
        <span className="text-slate-300">Historical Risk (High)</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
        <span className="text-slate-300">Medium Risk</span>
      </div>

      {/* Radius Rings */}
      <div className="flex items-center gap-1.5 text-slate-400">
        <span className="w-3 h-0.5 border-t border-dashed border-slate-600 inline-block"></span>
        <span>Radius Boundaries (5 / 10 / 20 km)</span>
      </div>
    </div>
  );
}
