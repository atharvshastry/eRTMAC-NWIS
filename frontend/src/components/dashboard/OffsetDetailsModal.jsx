import React from 'react';
import { X } from 'lucide-react';

const CATEGORY_TITLES = {
  nearby: 'Nearby Wells',
  highRisk: 'High Risk Wells',
  historical: 'Historical Events',
};

function formatDepth(value) {
  return value === undefined || value === null ? '-' : `${value.toLocaleString()} m`;
}

function Cell({ children }) {
  return <td className="px-3 py-2.5 text-xs text-zinc-300 whitespace-nowrap">{children || '-'}</td>;
}

export default function OffsetDetailsModal({ category, data, onClose }) {
  const title = CATEGORY_TITLES[category];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#101012] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offset-details-title"
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-4 sm:px-6">
          <div>
            <h2 id="offset-details-title" className="text-base font-semibold text-white">
              {title} <span className="font-mono text-zinc-400">({data.length})</span>
            </h2>
            <p className="mt-1 text-xs text-zinc-500">Selected well offset intelligence</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close offset details" className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-92px)] overflow-auto">
          {data.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">No records available for this category.</div>
          ) : (
            <table className="min-w-full border-collapse text-left">
              <thead className="sticky top-0 bg-[#151518] text-[10px] uppercase tracking-wider text-zinc-500">
                {category === 'nearby' && <tr>{['Well ID', 'Distance', 'Status', 'Formation', 'Total Depth', 'Risk Level', 'Historical Events'].map((heading) => <th key={heading} className="px-3 py-3 font-medium">{heading}</th>)}</tr>}
                {category === 'highRisk' && <tr>{['Well ID', 'Distance', 'Formation', 'Risk Type', 'Risk Level', 'Event Depth', 'Historical Events'].map((heading) => <th key={heading} className="px-3 py-3 font-medium">{heading}</th>)}</tr>}
                {category === 'historical' && <tr>{['Well ID', 'Depth', 'Event', 'Severity', 'Formation', 'Description', 'NPT'].map((heading) => <th key={heading} className="px-3 py-3 font-medium">{heading}</th>)}</tr>}
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {category === 'nearby' && data.map((well) => <tr key={well.id} className="hover:bg-white/[0.03]"><Cell><span className="font-mono text-white">{well.id}</span></Cell><Cell>{well.distanceKm} km</Cell><Cell>{well.status}</Cell><Cell>{well.formation}</Cell><Cell>{formatDepth(well.totalDepth)}</Cell><Cell><span className={well.riskLevel === 'HIGH' ? 'text-rose-400' : well.riskLevel === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'}>{well.riskLevel}</span></Cell><Cell>{well.historicalEvents.length}</Cell></tr>)}
                {category === 'highRisk' && data.map((well) => <tr key={well.id} className="hover:bg-white/[0.03]"><Cell><span className="font-mono text-white">{well.id}</span></Cell><Cell>{well.distanceKm} km</Cell><Cell>{well.formation}</Cell><Cell>{well.historicalEvents[0]?.type || 'Historical risk'}</Cell><Cell><span className="text-rose-400">{well.riskLevel}</span></Cell><Cell>{formatDepth(well.historicalEvents[0]?.depth)}</Cell><Cell>{well.historicalEvents.length}</Cell></tr>)}
                {category === 'historical' && data.map((event, index) => <tr key={`${event.wellId}-${event.depth}-${index}`} className="align-top hover:bg-white/[0.03]"><Cell><span className="font-mono text-white">{event.wellId}</span></Cell><Cell>{formatDepth(event.depth)}</Cell><Cell>{event.type}</Cell><Cell>{event.severity}</Cell><Cell>{event.formation}</Cell><Cell><span className="whitespace-normal leading-relaxed">{event.description}</span></Cell><Cell>{event.npt}</Cell></tr>)}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
