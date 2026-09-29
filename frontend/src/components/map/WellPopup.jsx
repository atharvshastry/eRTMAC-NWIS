import React from 'react';
import { X, Layers, Compass, Gauge, AlertTriangle, ArrowRight, GitCompare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WellPopup({ well, onClose, onCompare }) {
  const navigate = useNavigate();

  if (!well) return null;

  const isCurrentActive = well.isActive;

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'HIGH':
        return 'text-red-400 bg-red-950/70 border-red-900/80';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-950/70 border-amber-900/80';
      case 'LOW':
      default:
        return 'text-blue-400 bg-blue-950/70 border-blue-900/80';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-sm shadow-2xl p-4 w-72 sm:w-80 text-xs text-slate-200 z-50 select-none animate-in fade-in zoom-in-95 duration-100">
      {/* Header */}
      <div className="flex items-start justify-between pb-2 border-b border-slate-800 mb-2.5">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isCurrentActive
                  ? 'bg-blue-500'
                  : well.riskLevel === 'HIGH'
                  ? 'bg-red-500'
                  : well.riskLevel === 'MEDIUM'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            ></span>
            <span className="text-[10px] font-mono uppercase text-slate-400">
              {isCurrentActive ? 'Active Well' : 'Offset Well'}
            </span>
          </div>
          <h4 className="text-sm font-bold text-white font-mono">{well.id}</h4>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-sm hover:bg-slate-800 transition-colors"
          aria-label="Close popup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Details Grid */}
      <div className="grid grid-cols-2 gap-2 p-2 rounded-sm bg-slate-950 border border-slate-800 mb-3 text-[11px] font-mono">
        <div>
          <span className="text-[9px] text-slate-500 block">Distance</span>
          <span className="font-semibold text-slate-200">
            {isCurrentActive ? '0.0 km (Reference)' : `${well.distanceKm} km`}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 block">Total Depth</span>
          <span className="font-semibold text-slate-200">
            {isCurrentActive ? `${well.currentDepth} m (Active)` : `${well.totalDepth} m`}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 block">Formation</span>
          <span className="font-semibold text-slate-200 truncate block">
            {well.formation}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 block">Status</span>
          <span className="font-semibold text-emerald-400">
            {well.status}
          </span>
        </div>
      </div>

      {/* Historical Events List */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono text-slate-400">
          <span className="uppercase font-semibold">Historical Events</span>
          <span>{well.historicalEvents?.length || 0} logged</span>
        </div>

        {well.historicalEvents && well.historicalEvents.length > 0 ? (
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {well.historicalEvents.map((ev, idx) => (
              <div
                key={idx}
                className="p-1.5 rounded-sm bg-slate-950/80 border border-slate-800/80 text-[10px]"
              >
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span
                    className={`font-mono font-bold px-1 py-0.5 rounded-xs border text-[9px] ${getSeverityBadge(
                      ev.severity
                    )}`}
                  >
                    {ev.severity} — {ev.type}
                  </span>
                  {ev.depth && (
                    <span className="text-slate-400 font-mono text-[9px]">
                      @{ev.depth}m
                    </span>
                  )}
                </div>
                <p className="text-slate-400 leading-tight font-sans">
                  {ev.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2 rounded-sm bg-slate-950/60 border border-slate-800 text-[10px] text-slate-500 font-mono text-center">
            No critical historical drilling hazards logged.
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={() => navigate(`/well-intelligence?wellId=${well.id}`)}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
        >
          <span>View Well Intelligence</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (onCompare) onCompare(well);
          }}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium text-xs transition-colors"
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>Compare Well</span>
        </button>
      </div>
    </div>
  );
}
