import React from 'react';
import { Radio } from 'lucide-react';

export default function LiveEventStream({ events = [] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-3">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800 mb-2">
        <Radio className="w-4 h-4 text-blue-400" />
        <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
          Recent Live Events
        </h3>
        <span className="ml-auto text-[9px] font-mono text-slate-500">
          {events.length} events
        </span>
      </div>

      {/* Event List */}
      <div className="space-y-0 max-h-48 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-[10px] text-slate-500 font-mono italic py-2">
            Waiting for events…
          </div>
        ) : (
          events.map((evt, idx) => (
            <div
              key={`${evt.time}-${idx}`}
              className={`flex items-start gap-2 py-1.5 text-xs font-mono ${
                idx === 0 ? 'text-slate-200' : 'text-slate-400'
              } ${idx < events.length - 1 ? 'border-b border-slate-800/50' : ''}`}
            >
              <span className="text-slate-500 shrink-0 text-[11px]">{evt.time}</span>
              <span className="text-slate-600 shrink-0">—</span>
              <span className={idx === 0 ? 'text-blue-300' : ''}>{evt.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
