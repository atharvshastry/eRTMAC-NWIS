import React from 'react';
import { Layers } from 'lucide-react';

export default function FormationInfo({ formations = [] }) {
  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'HIGH':
        return 'text-red-400 bg-red-950/60 border-red-900/80';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-950/60 border-amber-900/80';
      case 'LOW':
      default:
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-900/80';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-3.5 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
            Stratigraphic Formations &amp; Lithology
          </h3>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {formations.length} Horizons
        </span>
      </div>

      {/* Formations Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase bg-slate-950/60">
              <th className="py-2 px-2.5">Formation</th>
              <th className="py-2 px-2.5 font-mono">Interval (Top – Base)</th>
              <th className="py-2 px-2.5">Lithology</th>
              <th className="py-2 px-2.5 text-right">Hazard Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {formations.map((f, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2 px-2.5 font-semibold text-slate-200">
                  {f.formation}
                </td>
                <td className="py-2 px-2.5 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                  {f.topDepth?.toLocaleString()} – {f.bottomDepth?.toLocaleString()} m
                </td>
                <td className="py-2 px-2.5 text-slate-400 text-[11px]">
                  {f.lithology}
                </td>
                <td className="py-2 px-2.5 text-right whitespace-nowrap">
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-xs border uppercase ${getRiskBadge(
                      f.historicalRisk
                    )}`}
                  >
                    {f.historicalRisk}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
