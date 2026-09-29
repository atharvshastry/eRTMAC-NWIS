import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import WellMap from '../../components/map/WellMap';
import MapFilters from '../../components/map/MapFilters';
import WellLegend from '../../components/map/WellLegend';
import { getNearbyWells } from '../../services/wellApi';
import { Compass, AlertTriangle, CheckCircle2 } from 'lucide-react';

// Fields the map can be centered on. OIL-DEMO-001 is the fixed alias for the one live
// active well (Assam-Arakan); the Mumbai High id is a real dataset id passed straight
// through (wellIdMap.toRealId passes through ids it doesn't recognize as demo ids), which
// re-centers the map on that well and its own real nearby wells via /api/wells/nearby.
const FIELD_OPTIONS = [
  { id: 'OIL-DEMO-001', label: 'Assam\u2013Arakan (Active Well)' },
  { id: 'OIL-SYN-MH-001', label: 'Mumbai High (Offshore)' },
];

export default function NearbyWells() {
  const [centerWellId, setCenterWellId] = useState(FIELD_OPTIONS[0].id);
  const [activeWell, setActiveWell] = useState(null);
  const [wells, setWells] = useState([]);
  const [summary, setSummary] = useState({
    nearbyWells: 0,
    highRiskWells: 0,
    historicalEvents: 0,
    searchRadius: 10,
  });
  const [filters, setFilters] = useState({
    radius: 10,
    formation: 'ALL',
    status: 'ALL',
    eventTypes: [],
  });
  const [selectedWell, setSelectedWell] = useState(null);
  const [comparedWell, setComparedWell] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load wells through the wellApi service
  const loadWells = async (filterParams, wellId) => {
    setLoading(true);
    try {
      const data = await getNearbyWells({
        wellId,
        ...filterParams,
      });
      setActiveWell(data.activeWell);
      setWells(data.wells);
      setSummary(data.summary);
    } catch (err) {
      console.error('Failed to fetch nearby wells:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWells(filters, centerWellId);
  }, [filters, centerWellId]);

  const handleFieldChange = (id) => {
    if (id === centerWellId) return;
    setCenterWellId(id);
    setSelectedWell(null);
    setComparedWell(null);
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setSelectedWell(null);
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      radius: 10,
      formation: 'ALL',
      status: 'ALL',
      eventTypes: [],
    };
    setFilters(defaultFilters);
    setSelectedWell(null);
  };

  const handleCompareWell = (well) => {
    setComparedWell(well);
    setSelectedWell(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Nearby Wells Intelligence Map"
        subtitle="Interactive geospatial well mapping, offset hazard correlation, and proximity radius filtering for active drilling operations."
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="field-select" className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">
              Field
            </label>
            <select
              id="field-select"
              value={centerWellId}
              onChange={(e) => handleFieldChange(e.target.value)}
              className="bg-[#121215] border border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono font-medium text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {FIELD_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* Compare Notice Banner if active */}
      {comparedWell && (
        <div className="p-4 rounded-2xl bg-[#121215] border border-white/[0.12] text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-zinc-200">
              Offset well <strong className="font-mono text-white">{comparedWell.id}</strong> (Dist: {comparedWell.distanceKm} km, Depth: {comparedWell.totalDepth} m) selected for stratigraphic correlation.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setComparedWell(null)}
            className="text-xs font-mono text-zinc-400 hover:text-white underline ml-3 cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Main Screen: Map + Controls Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left / Center: Interactive Map Container (Col 3 on Desktop) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Large Interactive Map */}
          <div className="bg-[#101012] border border-white/[0.08] hover:border-white/[0.14] rounded-[22px] p-2.5 overflow-hidden transition-all duration-200">
            <WellMap
              activeWell={activeWell}
              wells={wells}
              currentRadius={filters.radius}
              selectedWell={selectedWell}
              onSelectWell={setSelectedWell}
              onClosePopup={() => setSelectedWell(null)}
              onCompareWell={handleCompareWell}
              loading={loading}
            />
          </div>

          {/* Map Symbology Legend */}
          <WellLegend />
        </div>

        {/* Right / Sidebar: Filter Panel & Summary (Col 1 on Desktop) */}
        <div className="lg:col-span-1 space-y-6">
          {/* 1. Map Controls / Filters */}
          <MapFilters
            initialRadius={filters.radius}
            initialFormation={filters.formation === 'ALL' ? 'All Formations' : filters.formation}
            initialStatus={filters.status}
            initialEvents={filters.eventTypes}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
          />

          {/* 2. Nearby Well Summary Panel */}
          <div className="bg-[#101012] border border-white/[0.08] hover:border-white/[0.14] rounded-[22px] p-6 space-y-4 text-xs select-none transition-all duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="icon-squircle-sm">
                  <Compass className="w-4 h-4 text-zinc-200" />
                </div>
                <span className="font-semibold text-white tracking-tight text-sm">
                  Proximity Summary
                </span>
              </div>
              <span className="badge-neutral font-mono">
                {summary.searchRadius} km
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-zinc-200">
              {/* Nearby Wells Count */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] text-zinc-500 font-mono block mb-1">
                  Nearby Wells
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                  {summary.nearbyWells}
                </span>
              </div>

              {/* High Risk Wells Count */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] text-zinc-500 font-mono block mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  High Risk
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
                  {summary.highRiskWells}
                </span>
              </div>

              {/* Historical Events */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] col-span-2">
                <span className="text-[11px] text-zinc-500 font-mono block mb-1">
                  Historical Hazard Logs
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                    {summary.historicalEvents}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    within {summary.searchRadius} km
                  </span>
                </div>
              </div>
            </div>

            {/* Active Reference Well Meta */}
            <div className="pt-3 border-t border-white/[0.06] text-xs text-zinc-400 font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">Active Target:</span>
                <span className="text-white font-medium">{activeWell?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Coordinates:</span>
                <span className="text-zinc-300">{activeWell?.lat.toFixed(4)}°N, {activeWell?.lon.toFixed(4)}°E</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Current Depth:</span>
                <span className="text-zinc-200">{activeWell?.currentDepth} m</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
