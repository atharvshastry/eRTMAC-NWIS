import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  MapPin,
  ArrowUpDown,
  Mountain,
  Gauge,
  AlertTriangle,
  HardHat,
  ShieldCheck,
  Lightbulb,
  Table as TableIcon,
  LayoutGrid,
} from 'lucide-react';
import EntityTable from './EntityTable';

const CATEGORY_METADATA = {
  WELL: {
    title: 'WELL',
    icon: HardHat,
    color: 'text-blue-400',
    borderColor: 'border-blue-900/60',
    bgColor: 'bg-blue-950/20',
  },
  LOCATION: {
    title: 'LOCATION',
    icon: MapPin,
    color: 'text-indigo-400',
    borderColor: 'border-indigo-900/60',
    bgColor: 'bg-indigo-950/20',
  },
  DEPTH: {
    title: 'DEPTH',
    icon: ArrowUpDown,
    color: 'text-sky-400',
    borderColor: 'border-sky-900/60',
    bgColor: 'bg-sky-950/20',
  },
  FORMATION: {
    title: 'FORMATION',
    icon: Mountain,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-900/60',
    bgColor: 'bg-emerald-950/20',
  },
  DRILLING_PARAMETERS: {
    title: 'DRILLING PARAMETERS',
    icon: Gauge,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-900/60',
    bgColor: 'bg-cyan-950/20',
  },
  OPERATIONAL_EVENTS: {
    title: 'OPERATIONAL EVENTS',
    icon: AlertTriangle,
    color: 'text-amber-400',
    borderColor: 'border-amber-900/60',
    bgColor: 'bg-amber-950/20',
  },
  CASING_AND_CEMENTING: {
    title: 'CASING & CEMENTING',
    icon: Layers,
    color: 'text-teal-400',
    borderColor: 'border-teal-900/60',
    bgColor: 'bg-teal-950/20',
  },
  MITIGATION: {
    title: 'MITIGATION',
    icon: ShieldCheck,
    color: 'text-purple-400',
    borderColor: 'border-purple-900/60',
    bgColor: 'bg-purple-950/20',
  },
  LESSONS_LEARNED: {
    title: 'LESSONS LEARNED',
    icon: Lightbulb,
    color: 'text-yellow-400',
    borderColor: 'border-yellow-900/60',
    bgColor: 'bg-yellow-950/20',
  },
};

export default function EntityExtraction({
  entitiesData,
  documentName = 'Selected Document',
}) {
  const [activeTab, setActiveTab] = useState('grid'); // 'grid' | 'table'

  if (!entitiesData || !entitiesData.categories) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-sm p-8 text-center text-slate-400 text-xs">
        No extracted entities available. Process a document to extract structured drilling metadata.
      </div>
    );
  }

  const { categories, totalEntities, averageConfidence, extractedDate } = entitiesData;

  const getConfidenceBadge = (confidence) => {
    let colorClass = 'text-green-400 bg-green-950/70 border-green-800/80';
    if (confidence < 90) {
      colorClass = 'text-amber-400 bg-amber-950/70 border-amber-800/80';
    } else if (confidence < 94) {
      colorClass = 'text-blue-400 bg-blue-950/70 border-blue-800/80';
    }

    return (
      <span
        className={`px-1.5 py-0.5 rounded-sm text-[10px] font-mono border ${colorClass} shrink-0`}
        title={`Extraction confidence: ${confidence}%`}
      >
        {confidence}%
      </span>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100">
                Extracted Entities
              </h3>
              {/* Mandatory DEMO NLP EXTRACTION label */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-amber-950/70 text-amber-400 border border-amber-700/60 text-[10px] font-mono font-bold tracking-wider uppercase">
                <Sparkles className="w-3 h-3" />
                DEMO NLP EXTRACTION
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
              Source: <span className="text-slate-300">{documentName}</span> · Verified at {extractedDate || 'Just now'}
            </p>
          </div>
        </div>

        {/* View Toggle & Metrics */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-400 border-r border-slate-800 pr-3">
            <span>
              Entities: <strong className="text-slate-200">{totalEntities || 31}</strong>
            </span>
            <span>·</span>
            <span>
              Avg Conf: <strong className="text-green-400">{averageConfidence || 95}%</strong>
            </span>
          </div>

          <div className="inline-flex p-0.5 bg-slate-800 rounded-sm border border-slate-700/70">
            <button
              type="button"
              onClick={() => setActiveTab('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
                activeTab === 'grid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Category View</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
                activeTab === 'table'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Entity Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'table' ? (
          <EntityTable flatRows={entitiesData.flatRows || []} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {Object.entries(categories).map(([categoryKey, items]) => {
              const meta = CATEGORY_METADATA[categoryKey] || {
                title: categoryKey,
                icon: Layers,
                color: 'text-slate-300',
                borderColor: 'border-slate-800',
                bgColor: 'bg-slate-900',
              };
              const Icon = meta.icon;

              return (
                <div
                  key={categoryKey}
                  className={`rounded-sm border ${meta.borderColor} ${meta.bgColor} p-3 flex flex-col justify-between`}
                >
                  <div>
                    {/* Category Title */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                        <h4 className="text-xs font-semibold text-slate-200 tracking-wider">
                          {meta.title}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    {/* Entities Key-Value List */}
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-1.5 rounded-sm bg-slate-950/60 border border-slate-800/70 hover:border-slate-700/80 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[11px] font-medium text-slate-400 font-mono">
                              {item.label}
                            </span>
                            {getConfidenceBadge(item.confidence)}
                          </div>
                          <div className="text-xs text-slate-200 font-medium mt-1 leading-snug break-words">
                            {item.value}
                          </div>
                          {item.source && (
                            <div className="text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-900 flex items-center justify-between">
                              <span className="truncate">Ref: {item.source}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
