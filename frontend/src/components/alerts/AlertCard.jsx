import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  Compass,
  Layers,
  ChevronRight,
  CheckCircle,
  Eye,
  Check,
  Sparkles,
} from 'lucide-react';

const SEVERITY_CONFIG = {
  Critical: {
    badge: 'bg-red-950/80 text-red-400 border-red-800/80',
    indicator: 'bg-red-500',
    border: 'border-l-4 border-l-red-500',
  },
  High: {
    badge: 'bg-orange-950/80 text-orange-400 border-orange-800/80',
    indicator: 'bg-orange-500',
    border: 'border-l-4 border-l-orange-500',
  },
  Medium: {
    badge: 'bg-amber-950/80 text-amber-400 border-amber-800/80',
    indicator: 'bg-amber-500',
    border: 'border-l-4 border-l-amber-500',
  },
  Low: {
    badge: 'bg-green-950/80 text-green-400 border-green-800/80',
    indicator: 'bg-green-500',
    border: 'border-l-4 border-l-green-500',
  },
};

const STATUS_CONFIG = {
  Active: {
    badge: 'bg-blue-950/60 text-blue-400 border-blue-800/70',
    dot: 'bg-blue-400',
  },
  Acknowledged: {
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
    dot: 'bg-amber-400',
  },
  Resolved: {
    badge: 'bg-slate-900 text-slate-500 border-slate-800 line-through',
    dot: 'bg-green-500',
  },
};

export default function AlertCard({
  alert,
  isSelected = false,
  onSelect,
  onAcknowledge,
  onResolve,
}) {
  const severityStyle = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.Medium;
  const statusStyle = STATUS_CONFIG[alert.status] || STATUS_CONFIG.Active;

  return (
    <div
      onClick={() => onSelect && onSelect(alert)}
      className={`bg-slate-900 border rounded-sm p-3.5 transition-all duration-150 cursor-pointer ${
        severityStyle.border
      } ${
        isSelected
          ? 'border-blue-500 bg-slate-900/95 ring-1 ring-blue-500/40'
          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850'
      }`}
    >
      {/* Top Header: ID, Type, Severity, Status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-slate-200">
            {alert.id}
          </span>
          <span
            className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase border ${severityStyle.badge}`}
          >
            {alert.severity}
          </span>
          <span className="text-xs font-semibold text-slate-100">
            {alert.type}
          </span>
          {alert.isHistoricalPattern && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-blue-950/60 text-blue-300 border border-blue-800/50 text-[10px] font-mono">
              <Sparkles className="w-2.5 h-2.5 text-blue-400" />
              Pattern Match
            </span>
          )}
        </div>

        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono font-medium border ${statusStyle.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
          {alert.status}
        </span>
      </div>

      {/* Meta strip: Well ID, Depth, Formation, Detection Time */}
      <div className="flex items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-400 flex-wrap py-1.5 border-y border-slate-800/70 mb-2">
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Well:</span>
          <strong className="text-slate-200">{alert.wellId}</strong>
        </div>
        <span>·</span>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Depth:</span>
          <strong className="text-slate-200">{alert.currentDepth} m</strong>
        </div>
        <span>·</span>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Formation:</span>
          <span className="text-slate-300">{alert.formation}</span>
        </div>
        <span>·</span>
        <div className="flex items-center gap-1 ml-auto text-slate-400">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>{alert.detectionTime}</span>
        </div>
      </div>

      {/* Short Description */}
      <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
        {alert.shortDescription}
      </p>

      {/* Historical Evidence Callout */}
      {alert.evidence && (
        <div className="p-2 bg-slate-950/70 rounded-sm border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between gap-2 mb-3">
          <div className="truncate">
            <span className="text-blue-400 font-semibold mr-1.5">Evidence:</span>
            <span>
              Offset <strong className="text-slate-300">{alert.evidence.relatedWell}</strong> at {alert.evidence.historicalDepth} m ({alert.evidence.similarity}% similarity)
            </span>
          </div>
          <span className="text-slate-500 shrink-0 text-[10px]">
            {alert.evidence.sourceDocument.split(' ')[0]}
          </span>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          {alert.status === 'Active' && onAcknowledge && (
            <button
              type="button"
              onClick={() => onAcknowledge(alert.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors"
            >
              <Check className="w-3 h-3 text-amber-400" />
              <span>Acknowledge</span>
            </button>
          )}

          {alert.status !== 'Resolved' && onResolve && (
            <button
              type="button"
              onClick={() => onResolve(alert.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors"
            >
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span>Resolve</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSelect && onSelect(alert)}
          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium py-1 px-1 transition-colors"
        >
          <span>View Details</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
