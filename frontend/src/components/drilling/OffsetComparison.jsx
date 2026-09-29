import React from 'react';
import { GitCompareArrows } from 'lucide-react';

export default function OffsetComparison({ data }) {
  if (!data) return null;

  const { parameters, units, currentWell, averageOffset, nearestSimilar } = data;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-3">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800 mb-3">
        <GitCompareArrows className="w-4 h-4 text-blue-400" />
        <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
          Offset Comparison
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left py-1.5 pr-2 text-slate-400 font-medium">Parameter</th>
              <th className="text-right py-1.5 px-2 text-blue-400 font-medium">Current Well</th>
              <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Avg Offset</th>
              <th className="text-right py-1.5 pl-2 text-slate-400 font-medium">Nearest Similar</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param, idx) => {
              const curr = currentWell[idx];
              const avg = averageOffset[idx];
              const near = nearestSimilar[idx];
              const diffFromAvg = curr - avg;
              const diffColor = diffFromAvg > 0 ? 'text-blue-400' : diffFromAvg < 0 ? 'text-amber-400' : 'text-slate-400';

              return (
                <tr key={param} className="border-b border-slate-800/60">
                  <td className="py-1.5 pr-2 text-slate-300">
                    {param}
                    <span className="text-slate-500 ml-1 text-[10px]">{units[idx]}</span>
                  </td>
                  <td className={`text-right py-1.5 px-2 font-semibold ${diffColor}`}>
                    {curr.toLocaleString()}
                  </td>
                  <td className="text-right py-1.5 px-2 text-slate-400">
                    {avg.toLocaleString()}
                  </td>
                  <td className="text-right py-1.5 pl-2 text-slate-400">
                    {near.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-blue-500 rounded-sm inline-block" />
          <span>Above Offset Avg</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-amber-500 rounded-sm inline-block" />
          <span>Below Offset Avg</span>
        </div>
      </div>
    </div>
  );
}
