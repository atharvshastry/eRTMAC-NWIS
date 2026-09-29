import React from 'react';
import { Clock, Layers, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';

const SEVERITY_DOT = {
  Critical: 'bg-red-500 ring-red-950',
  High: 'bg-orange-500 ring-orange-950',
  Medium: 'bg-amber-500 ring-amber-950',
  Low: 'bg-green-500 ring-green-950',
};

const SEVERITY_BADGE = {
  Critical: 'text-red-400 bg-red-950/80 border-red-800',
  High: 'text-orange-400 bg-orange-950/80 border-orange-800',
  Medium: 'text-amber-400 bg-amber-950/80 border-amber-800',
  Low: 'text-green-400 bg-green-950/80 border-green-800',
};

export default function AlertTimeline({
  events = [],
  onSelectEvent,
}) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 text-center text-slate-500 text-xs font-mono">
        No recent alert timeline events recorded.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Operational Alert Timeline
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          Chronological (Latest First)
        </span>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {events.map((evt) => {
          const dotColor = SEVERITY_DOT[evt.severity] || SEVERITY_DOT.Medium;
          const badgeColor = SEVERITY_BADGE[evt.severity] || SEVERITY_BADGE.Medium;

          return (
            <div
              key={evt.id}
              onClick={() => onSelectEvent && onSelectEvent(evt)}
              className="relative group cursor-pointer transition-colors"
            >
              {/* Dot */}
              <div
                className={`absolute -left-[14px] top-1.5 w-2.5 h-2.5 rounded-full ring-2 ${dotColor} transition-transform group-hover:scale-125`}
              />

              <div className="p-2 rounded-sm bg-slate-950/60 border border-slate-800/80 group-hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-slate-200 font-bold">{evt.time}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-blue-400 font-semibold">{evt.depth}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400 text-[10px]">{evt.wellId}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1.5 py-0.2 rounded-sm text-[9px] font-mono font-bold uppercase border ${badgeColor}`}
                    >
                      {evt.severity}
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        evt.status === 'Resolved'
                          ? 'text-slate-500 line-through'
                          : evt.status === 'Active'
                          ? 'text-blue-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {evt.status}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-300 font-medium leading-snug">
                  {evt.event}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
