import React from 'react';
import { Layers } from 'lucide-react';

export default function FormationStatus({ formation }) {
  if (!formation) return null;

  const progressPct = formation.currentDepth && formation.topDepth
    ? Math.min(100, Math.round(((formation.currentDepth - formation.topDepth) / (formation.topDepth * 0.3)) * 100))
    : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-3">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800 mb-3">
        <Layers className="w-4 h-4 text-blue-400" />
        <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
          Current Formation
        </h3>
      </div>

      {/* Formation Name */}
      <div className="text-sm font-bold text-slate-100 font-mono mb-3">{formation.name}</div>

      {/* Details Grid */}
      <div className="space-y-2 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-slate-400">Top Depth</span>
          <span className="text-slate-200 font-semibold">{formation.topDepth?.toLocaleString()} m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Current Depth</span>
          <span className="text-slate-200 font-semibold">{formation.currentDepth?.toLocaleString()} m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Status</span>
          <span className="text-blue-400 font-semibold">{formation.status}</span>
        </div>
      </div>

      {/* Simple progress bar */}
      <div className="mt-3 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
          <span>Formation Progress</span>
          <span>{progressPct}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-sm overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-sm transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
