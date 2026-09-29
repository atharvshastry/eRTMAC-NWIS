import React from 'react';

export default function KnowledgeResultDetails({ data, onClose, onOpenWellIntelligence }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-slate-900 text-slate-100 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-blue-300">{data.documentName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>
        <div className="space-y-2 text-sm">
          <p><strong>Well ID:</strong> {data.wellId}</p>
          <p><strong>Formation:</strong> {data.formation}</p>
          <p><strong>Depth:</strong> {data.depth} m</p>
          <p><strong>Event:</strong> {data.event}</p>
          <p><strong>Severity:</strong> {data.severity}</p>
          <p><strong>Historical Observation:</strong> {data.description}</p>
          <p><strong>Historical Mitigation:</strong> {data.mitigation}</p>
          <p><strong>Source Document:</strong> {data.source}</p>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => onOpenWellIntelligence(data.wellId)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition"
          >
            Open Well Intelligence
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-slate-200 rounded hover:bg-slate-600 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
