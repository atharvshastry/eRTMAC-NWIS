import React, { useState, useMemo } from 'react';
import { Search, Filter, CheckCircle2, ChevronDown } from 'lucide-react';

export default function EntityTable({ flatRows = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categoriesList = useMemo(() => {
    const set = new Set();
    flatRows.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set).sort();
  }, [flatRows]);

  const filteredRows = useMemo(() => {
    return flatRows.filter((row) => {
      const matchesCategory =
        selectedCategory === 'ALL' || row.category === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        row.entity.toLowerCase().includes(term) ||
        row.category.toLowerCase().includes(term) ||
        row.value.toLowerCase().includes(term) ||
        (row.source && row.source.toLowerCase().includes(term));

      return matchesCategory && matchesSearch;
    });
  }, [flatRows, selectedCategory, searchTerm]);

  const getConfidenceBadge = (confidence) => {
    let colorClass = 'text-green-400 bg-green-950/70 border-green-800/80';
    if (confidence < 90) {
      colorClass = 'text-amber-400 bg-amber-950/70 border-amber-800/80';
    } else if (confidence < 94) {
      colorClass = 'text-blue-400 bg-blue-950/70 border-blue-800/80';
    }

    return (
      <span
        className={`px-1.5 py-0.5 rounded-sm text-[10px] font-mono border ${colorClass} inline-flex items-center gap-1`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {confidence}%
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Controls: Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter entities, values, or sources..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-sm text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950/70 border border-slate-800 rounded-sm text-xs text-slate-300 py-1.5 px-2.5 focus:outline-none focus:border-blue-600 transition-colors"
          >
            <option value="ALL">All Categories ({flatRows.length})</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Structured Table */}
      <div className="border border-slate-800 rounded-sm overflow-hidden bg-slate-950/40">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400 font-mono text-[11px] z-10">
              <tr>
                <th className="py-2.5 px-3">Entity</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Value</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Source Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 text-xs">
                    No entities matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-200 whitespace-nowrap">
                      {row.entity}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded-sm bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[10px] font-mono">
                        {row.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-medium max-w-md">
                      {row.value}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getConfidenceBadge(row.confidence)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {row.source}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="px-3 py-2 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>
            Showing {filteredRows.length} of {flatRows.length} extracted entities
          </span>
          <span>Validated via Petrophysical Rulebook</span>
        </div>
      </div>
    </div>
  );
}
