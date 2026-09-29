import React from 'react';
import { Filter, RotateCcw, Search } from 'lucide-react';
import {
  ALERT_SEVERITIES,
  ALERT_TYPES,
  ALERT_STATUSES,
  WELL_OPTIONS,
  FORMATION_OPTIONS,
} from '../../data/mockAlerts';

export default function AlertFilters({
  filters,
  onChange,
  onClear,
  totalCount = 0,
  filteredCount = 0,
}) {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.severity !== 'ALL' ||
    filters.type !== 'ALL' ||
    filters.wellId !== 'ALL' ||
    filters.formation !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.minDepth !== '' ||
    filters.maxDepth !== '' ||
    filters.search !== '';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-3 space-y-2.5">
      {/* Top row: Search and Filter Summary */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="Search alert ID, event, observation, or text..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-sm text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 justify-between sm:justify-end">
          <span>
            Showing <strong className="text-slate-200">{filteredCount}</strong> of{' '}
            <strong className="text-slate-200">{totalCount}</strong> alerts
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-sm text-[11px] border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Selects Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
        {/* Severity */}
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">
            Severity
          </label>
          <select
            value={filters.severity}
            onChange={(e) => handleChange('severity', e.target.value)}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-sm text-xs text-slate-300 py-1.5 px-2 focus:outline-none focus:border-blue-600 transition-colors"
          >
            <option value="ALL">All Severities</option>
            {ALERT_SEVERITIES.map((sev) => (
              <option key={sev} value={sev}>
                {sev}
              </option>
            ))}
          </select>
        </div>

        {/* Alert Type */}
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">
            Alert Type
          </label>
          <select
            value={filters.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-sm text-xs text-slate-300 py-1.5 px-2 focus:outline-none focus:border-blue-600 transition-colors truncate"
          >
            <option value="ALL">All Alert Types</option>
            {ALERT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Well ID */}
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">
            Well
          </label>
          <select
            value={filters.wellId}
            onChange={(e) => handleChange('wellId', e.target.value)}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-sm text-xs text-slate-300 py-1.5 px-2 focus:outline-none focus:border-blue-600 transition-colors"
          >
            <option value="ALL">All Wells</option>
            {WELL_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        {/* Formation */}
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">
            Formation
          </label>
          <select
            value={filters.formation}
            onChange={(e) => handleChange('formation', e.target.value)}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-sm text-xs text-slate-300 py-1.5 px-2 focus:outline-none focus:border-blue-600 transition-colors truncate"
          >
            <option value="ALL">All Formations</option>
            {FORMATION_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-sm text-xs text-slate-300 py-1.5 px-2 focus:outline-none focus:border-blue-600 transition-colors"
          >
            <option value="ALL">All Statuses</option>
            {ALERT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Depth Range Min - Max */}
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">
            Depth Range (m)
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={filters.minDepth}
              onChange={(e) => handleChange('minDepth', e.target.value)}
              placeholder="Min"
              className="w-1/2 bg-slate-950/70 border border-slate-800 rounded-sm text-xs text-slate-300 py-1.5 px-1.5 focus:outline-none focus:border-blue-600 transition-colors font-mono"
            />
            <span className="text-slate-600 font-mono">-</span>
            <input
              type="number"
              value={filters.maxDepth}
              onChange={(e) => handleChange('maxDepth', e.target.value)}
              placeholder="Max"
              className="w-1/2 bg-slate-950/70 border border-slate-800 rounded-sm text-xs text-slate-300 py-1.5 px-1.5 focus:outline-none focus:border-blue-600 transition-colors font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
