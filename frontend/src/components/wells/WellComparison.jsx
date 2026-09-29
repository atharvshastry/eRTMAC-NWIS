import React from 'react';
import { GitCompare } from 'lucide-react';

export default function WellComparison({ activeWell, selectedWell }) {
  if (!activeWell || !selectedWell) return null;

  const comparisonRows = [
    {
      metric: 'Target Formation',
      active: activeWell.formation,
      selected: selectedWell.formation,
      highlight: false,
    },
    {
      metric: 'Depth (Current / TD)',
      active: `${activeWell.currentDepth?.toLocaleString()} m (Active)`,
      selected: `${selectedWell.totalDepth?.toLocaleString()} m (TD)`,
      highlight: false,
    },
    {
      metric: 'Mud Loss Event',
      active: activeWell.mudLoss || 'No',
      selected: selectedWell.mudLoss || 'Yes',
      highlight: selectedWell.mudLoss === 'Yes',
      statusClass:
        selectedWell.mudLoss === 'Yes' ? 'text-red-400 font-bold' : 'text-slate-300',
    },
    {
      metric: 'Stuck Pipe Event',
      active: activeWell.stuckPipe || 'No',
      selected: selectedWell.stuckPipe || 'Yes',
      highlight: selectedWell.stuckPipe === 'Yes',
      statusClass:
        selectedWell.stuckPipe === 'Yes' ? 'text-red-400 font-bold' : 'text-slate-300',
    },
    {
      metric: 'Cumulative NPT',
      active: `${activeWell.nptHours || 12} hr`,
      selected: `${selectedWell.nptHours || 36} hr`,
      highlight: true,
      statusClass: 'text-amber-400 font-bold font-mono',
    },
  ];

  return (
    <div
      id="well-comparison-section"
      className="bg-slate-900 border border-slate-800 rounded-sm p-4 space-y-3 h-full flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
            Active Well vs Offset Benchmark
          </h3>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">Delta Comparison</span>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto flex-1 flex flex-col justify-center">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-mono uppercase bg-slate-950/60">
              <th className="py-2 px-3 text-slate-400">Parameter</th>
              <th className="py-2 px-3 text-blue-400 font-bold">
                Active ({activeWell.id})
              </th>
              <th className="py-2 px-3 text-slate-200 font-bold">
                Offset ({selectedWell.id})
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {comparisonRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2 px-3 font-medium text-slate-400 text-xs">
                  {row.metric}
                </td>
                <td className="py-2 px-3 font-mono font-semibold text-slate-200">
                  {row.active}
                </td>
                <td className={`py-2 px-3 font-mono font-semibold ${row.statusClass || 'text-slate-200'}`}>
                  {row.selected}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex justify-between">
        <span>Spatial Separation: {selectedWell.distanceKm} km</span>
        <span>Reference Datum: WGS84</span>
      </div>
    </div>
  );
}
