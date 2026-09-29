import React from 'react';

export default function KnowledgeResult({ data, onViewDetails }) {
  const severityColor = {
    Low: 'text-green-400',
    Medium: 'text-amber-400',
    High: 'text-red-400',
  }[data.severity] || 'text-slate-400';

  return (
    <div className="p-3 bg-slate-800 border border-slate-700 rounded">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-blue-300">{data.wellId}</h3>
          <p className="text-xs text-slate-300">{data.documentName}</p>
          <p className="text-xs text-slate-400">{data.formation} • Depth: {data.depth} m</p>
          <p className="text-xs text-slate-400">Event: {data.event}</p>
          <p className={`text-xs font-semibold ${severityColor}`}>Severity: {data.severity}</p>
        </div>
        <button
          onClick={() => onViewDetails(data)}
          className="text-sm text-blue-500 hover:underline"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
