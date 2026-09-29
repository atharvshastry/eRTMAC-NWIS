import React, { useState } from 'react';
import { AlertCircle, Filter } from 'lucide-react';

const FILTER_TYPES = [
  'All',
  'Mud Loss',
  'Stuck Pipe',
  'Kick',
  'NPT',
  'Cementing Issue',
  'Fishing Operation',
];

export default function HistoricalEvents({ events = [] }) {
  const [selectedFilter, setSelectedFilter] = useState('All');

  const filteredEvents =
    selectedFilter === 'All'
      ? events
      : events.filter((e) =>
          e.type.toLowerCase().includes(selectedFilter.toLowerCase())
        );

  const getSeverityStyle = (severity) => {
    switch (severity) {
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
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 space-y-3">
      {/* Table Header & Event Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
            Historical Hazards &amp; Operational Events
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            ({filteredEvents.length} Events)
          </span>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-slate-400 font-mono mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Filter:
          </span>
          {FILTER_TYPES.map((type) => {
            const isActive = selectedFilter === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedFilter(type)}
                className={`px-2 py-0.5 rounded-xs text-[10px] font-mono transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase bg-slate-950/60">
              <th className="py-2 px-3">Depth</th>
              <th className="py-2 px-3">Event</th>
              <th className="py-2 px-3">Severity</th>
              <th className="py-2 px-3">Description</th>
              <th className="py-2 px-3">Mitigation / Remediation</th>
              <th className="py-2 px-3 text-right">NPT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2 px-3 font-mono font-bold text-slate-200 whitespace-nowrap">
                    {row.depth ? `${row.depth.toLocaleString()} m` : '—'}
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-200 whitespace-nowrap">
                    {row.type}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-xs border uppercase ${getSeverityStyle(
                        row.severity
                      )}`}
                    >
                      {row.severity}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-300 text-[11px] max-w-xs leading-snug">
                    {row.description}
                  </td>
                  <td className="py-2 px-3 text-slate-400 text-[11px] max-w-xs leading-snug">
                    {row.mitigation || 'Standard operational procedures.'}
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-slate-300 whitespace-nowrap">
                    {row.npt || '0 hr'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="py-6 text-center text-slate-500 font-mono text-xs"
                >
                  No events found matching filter: "{selectedFilter}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
