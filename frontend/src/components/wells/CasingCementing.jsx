import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function CasingCementing({ casingPrograms = [] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
            Casing Programme &amp; Cementing Records
          </h3>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {casingPrograms.length} Strings
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase bg-slate-950/60">
              <th className="py-2 px-3">Casing Size</th>
              <th className="py-2 px-3 font-mono">Setting Depth</th>
              <th className="py-2 px-3">Cement Type / Slurry</th>
              <th className="py-2 px-3 font-mono">Slurry Volume</th>
              <th className="py-2 px-3 text-right">Integrity Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {casingPrograms.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2 px-3 font-mono font-bold text-slate-200 whitespace-nowrap">
                  {row.casingSize}
                </td>
                <td className="py-2 px-3 font-mono text-slate-300 whitespace-nowrap">
                  {row.settingDepth}
                </td>
                <td className="py-2 px-3 text-slate-300 text-[11px]">
                  {row.cementType}
                </td>
                <td className="py-2 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                  {row.cementVolume}
                </td>
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  <span className="px-2 py-0.5 rounded-xs bg-slate-950 border border-slate-800 font-mono text-[10px] text-emerald-400 font-semibold">
                    {row.status}
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
