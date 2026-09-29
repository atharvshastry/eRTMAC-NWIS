import React from 'react';
import { History } from 'lucide-react';

export default function DrillingHistory({ events = [] }) {
  // Default sample milestones if events list is empty
  const timelineItems =
    events && events.length > 0
      ? events
      : [
          { depth: 2100, type: 'Normal Drilling', severity: 'LOW', description: 'Normal rotary drilling resumed smoothly.' },
          { depth: 2450, type: 'Torque Increase', severity: 'MEDIUM', description: 'Torque increased by 25% over baseline.' },
          { depth: 2680, type: 'Mud Loss', severity: 'HIGH', description: 'Partial losses of 45 bbl/hr recorded.' },
          { depth: 2900, type: 'Stuck Pipe', severity: 'HIGH', description: 'Differential sticking; worked string free.' },
          { depth: 3150, type: 'Cementing Operation', severity: 'LOW', description: 'Primary 7-inch liner cement displacement.' },
        ];

  const getSeverityPip = (severity) => {
    switch (severity) {
      case 'HIGH':
        return {
          dot: 'bg-red-500 ring-4 ring-red-950',
          badge: 'text-red-400 bg-red-950/60 border-red-900/80',
        };
      case 'MEDIUM':
        return {
          dot: 'bg-amber-500 ring-4 ring-amber-950',
          badge: 'text-amber-400 bg-amber-950/60 border-amber-900/80',
        };
      case 'LOW':
      default:
        return {
          dot: 'bg-emerald-500 ring-4 ring-emerald-950',
          badge: 'text-emerald-400 bg-emerald-950/60 border-emerald-900/80',
        };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-3.5 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
            Drilling History Timeline
          </h3>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">Depth Log</span>
      </div>

      {/* Timeline Steps */}
      <div className="relative pl-5 border-l border-slate-800 space-y-4 my-1">
        {timelineItems.map((item, idx) => {
          const style = getSeverityPip(item.severity);
          return (
            <div key={idx} className="relative group">
              {/* Timeline Pin/Dot on the vertical line */}
              <span
                className={`absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full ${style.dot}`}
              ></span>

              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-slate-200">
                    {item.depth?.toLocaleString()} m
                  </span>
                  <span className="text-slate-500 text-xs">—</span>
                  <span className="text-xs font-semibold text-slate-300">
                    {item.type}
                  </span>
                </div>

                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-xs border uppercase ${style.badge}`}
                >
                  {item.severity}
                </span>
              </div>

              {item.description && (
                <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5 font-sans">
                  {item.description}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-500 text-right">
        Total Recorded Intervals: {timelineItems.length}
      </div>
    </div>
  );
}
