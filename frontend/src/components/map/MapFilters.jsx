import React, { useState } from 'react';
import { Filter, RotateCcw, Check, SlidersHorizontal } from 'lucide-react';

// Includes both the original demo-fallback formation names AND the real dataset's formation
// names (Barail/Girujan/Lakwa/Nahorkatiya Sand/Tipam, from formation_log.csv) -- the filter
// needs to match whichever mode (mock fallback vs. real backend) the app is currently in.
const FORMATIONS = [
  'All Formations',
  'Barail',
  'Girujan',
  'Lakwa',
  'Nahorkatiya Sand',
  'Tipam',
  'Demo Formation',
  'Barail Sandstone',
  'Tipam Sandstone',
  'Girujan Clay',
  // Mumbai High field (added to enrich the dataset) -- real formation names from
  // formation_log.csv, same convention as the Assam names above.
  'Alibag',
  'Mumbai High Limestone',
  'Bassein',
  'Panna',
];

// Real wells report COMPLETED/DRILLING (uppercase, well_status in wells.csv); the fictional
// demo statuses are kept too so this still works against mock-fallback data.
const STATUSES = ['All', 'DRILLING', 'COMPLETED', 'Producing', 'Suspended', 'Abandoned', 'Drilling'];

const EVENT_CONFIGS = {
  'Mud Loss': {
    name: 'Mud Loss',
    color: '#d97706',
    activeBg: 'bg-[#e8dcce] border-[#b8956e] font-semibold',
    inactiveBg: 'bg-[#ded4c5]/80 border-[#bfa485]/80 hover:border-[#a88965]',
    dotActive: 'bg-[#92400e] border-[#78350f] text-white',
    dotInactive: 'border-[#92400e] bg-[#92400e]/30',
  },
  'Stuck Pipe': {
    name: 'Stuck Pipe',
    color: '#dc2626',
    activeBg: 'bg-[#eecdd2] border-[#cf7d88] font-semibold',
    inactiveBg: 'bg-[#e6c2c8]/80 border-[#cf8590]/80 hover:border-[#b8616e]',
    dotActive: 'bg-[#991b1b] border-[#7f1d1d] text-white',
    dotInactive: 'border-[#991b1b] bg-[#991b1b]/30',
  },
  'Kick': {
    name: 'Kick',
    color: '#9333ea',
    activeBg: 'bg-[#decfe8] border-[#a981c7] font-semibold',
    inactiveBg: 'bg-[#d6c4e0]/80 border-[#af8cc9]/80 hover:border-[#966eb3]',
    dotActive: 'bg-[#6b21a8] border-[#581c87] text-white',
    dotInactive: 'border-[#6b21a8] bg-[#6b21a8]/30',
  },
  'NPT': {
    name: 'NPT',
    color: '#0284c7',
    activeBg: 'bg-[#cddbe4] border-[#7b9fb5] font-semibold',
    inactiveBg: 'bg-[#c3d3dd]/80 border-[#7f9fad]/80 hover:border-[#638799]',
    dotActive: 'bg-[#075985] border-[#0c4a6e] text-white',
    dotInactive: 'border-[#075985] bg-[#075985]/30',
  },
  'Cementing': {
    name: 'Cementing',
    color: '#eab308',
    activeBg: 'bg-[#fef08a] border-[#ca8a04] font-semibold',
    inactiveBg: 'bg-[#fef9c3]/90 border-[#eab308]/80 hover:border-[#ca8a04]',
    dotActive: 'bg-[#ca8a04] border-[#a16207] text-white',
    dotInactive: 'border-[#ca8a04] bg-[#ca8a04]/30',
  },
  'Fishing': {
    name: 'Fishing',
    color: '#059669',
    activeBg: 'bg-[#cadcd4] border-[#74a591] font-semibold',
    inactiveBg: 'bg-[#bfd4cb]/80 border-[#7ca997]/80 hover:border-[#5c8d7a]',
    dotActive: 'bg-[#065f46] border-[#064e3b] text-white',
    dotInactive: 'border-[#065f46] bg-[#065f46]/30',
  },
};

const EVENT_TYPES = Object.keys(EVENT_CONFIGS);

export default function MapFilters({
  initialRadius = 10,
  initialFormation = 'All Formations',
  initialStatus = 'All',
  initialEvents = [],
  onApply,
  onReset,
}) {
  const [radius, setRadius] = useState(initialRadius);
  const [isCustomRadius, setIsCustomRadius] = useState(![5, 10, 20].includes(Number(initialRadius)));
  const [formation, setFormation] = useState(initialFormation);
  const [status, setStatus] = useState(initialStatus);
  const [selectedEvents, setSelectedEvents] = useState(initialEvents);

  const toggleEvent = (event) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const updateRadius = (newRadius, isCustom = false) => {
    setRadius(newRadius);
    setIsCustomRadius(isCustom);
    if (onApply) {
      onApply({
        radius: Number(newRadius),
        formation: formation === 'All Formations' ? 'ALL' : formation,
        status: status === 'All' ? 'ALL' : status,
        eventTypes: selectedEvents,
      });
    }
  };

  const handleApply = (e) => {
    e.preventDefault();
    if (onApply) {
      onApply({
        radius: Number(radius),
        formation: formation === 'All Formations' ? 'ALL' : formation,
        status: status === 'All' ? 'ALL' : status,
        eventTypes: selectedEvents,
      });
    }
  };

  const handleReset = () => {
    setRadius(10);
    setIsCustomRadius(false);
    setFormation('All Formations');
    setStatus('All');
    setSelectedEvents([]);
    if (onReset) {
      onReset();
    }
  };

  return (
    <form
      onSubmit={handleApply}
      className="bg-slate-900 border border-slate-800 rounded-sm p-3.5 space-y-4 text-xs text-slate-300 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 font-semibold text-slate-100 uppercase tracking-wider font-mono text-[11px]">
          <Filter className="w-3.5 h-3.5 text-blue-400" />
          <span>Map Filters &amp; Radius</span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 text-[10px] font-mono transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* 1. Search Radius */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono text-slate-400 block uppercase">
            Search Radius
          </label>
          <span className="text-[10px] font-mono text-slate-400">
            {radius} km
          </span>
        </div>

        {/* 4 Radius Option Buttons: 5 km, 10 km, 20 km, Custom */}
        <div className="grid grid-cols-4 gap-1.5">
          {[5, 10, 20].map((r) => {
            const isSelected = !isCustomRadius && Number(radius) === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => updateRadius(r, false)}
                className={`py-1.5 text-center font-mono text-xs rounded-sm border transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-500 font-bold'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 font-medium'
                }`}
              >
                {r} km
              </button>
            );
          })}

          {/* Custom Button */}
          <button
            type="button"
            onClick={() => {
              setIsCustomRadius(true);
            }}
            className={`py-1.5 text-center font-mono text-xs rounded-sm border transition-colors flex items-center justify-center gap-1 ${
              isCustomRadius
                ? 'bg-blue-600 text-white border-blue-500 font-bold'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 font-medium'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3 shrink-0" />
            <span>Custom</span>
          </button>
        </div>

        {/* Interactive Custom Radius Slider */}
        {isCustomRadius && (
          <div className="pt-2 px-2.5 pb-2 space-y-1.5 bg-slate-950 rounded-sm border border-slate-800 transition-all mt-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
              <span className="flex items-center gap-1 text-slate-400">
                <SlidersHorizontal className="w-3 h-3" />
                <span>Adjust Radius</span>
              </span>
              <span className="text-blue-400 font-bold">
                {radius} km
              </span>
            </div>

            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={radius}
              onChange={(e) => updateRadius(Number(e.target.value), true)}
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-sm appearance-none"
            />

            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>1 km</span>
              <span>25 km</span>
              <span>50 km</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Formation Select */}
      <div className="space-y-1">
        <label className="text-[10px] font-mono text-slate-400 block uppercase">
          Formation
        </label>
        <select
          value={formation}
          onChange={(e) => setFormation(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-sm px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
        >
          {FORMATIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Well Status Select */}
      <div className="space-y-1">
        <label className="text-[10px] font-mono text-slate-400 block uppercase">
          Well Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-sm px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* 4. Historical Hazard Events (6 Custom Colored Boxes) */}
      <div className="space-y-1.5 pt-1">
        <label className="text-[10px] font-mono text-slate-400 block uppercase">
          Historical Hazard Events
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {EVENT_TYPES.map((ev) => {
            const isChecked = selectedEvents.includes(ev);
            const cfg = EVENT_CONFIGS[ev];
            return (
              <button
                key={ev}
                type="button"
                onClick={() => toggleEvent(ev)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-sm border text-[11px] font-mono text-left transition-colors ${
                  isChecked ? cfg.activeBg : cfg.inactiveBg
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-xs border flex items-center justify-center shrink-0 ${
                    isChecked ? cfg.dotActive : cfg.dotInactive
                  }`}
                >
                  {isChecked && <Check className="w-2.5 h-2.5" />}
                </div>
                <span className="truncate font-semibold text-black" style={{ color: '#000000' }}>{ev}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 border-t border-slate-800 flex gap-2">
        <button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-1.5 px-3 rounded-sm transition-colors text-center text-xs tracking-wide"
        >
          Apply Filters
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 py-1.5 px-3 rounded-sm transition-colors text-xs"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
