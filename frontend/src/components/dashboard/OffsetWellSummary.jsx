import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, AlertTriangle, History, ArrowRight } from 'lucide-react';
import { DASHBOARD_WELLS, NEARBY_WELLS_DATA } from '../../data/mockWells';
import OffsetDetailsModal from './OffsetDetailsModal';

const OFFSET_WELL_IDS = {
  'OIL-DEMO-001': ['OIL-DEMO-002', 'OIL-DEMO-003', 'OIL-DEMO-004', 'OIL-DEMO-005'],
  'OIL-DEMO-002': ['OIL-DEMO-003', 'OIL-DEMO-004', 'OIL-DEMO-005', 'OIL-DEMO-007'],
  'OIL-DEMO-003': ['OIL-DEMO-002', 'OIL-DEMO-004', 'OIL-DEMO-005', 'OIL-DEMO-007'],
  'OIL-DEMO-004': ['OIL-DEMO-002', 'OIL-DEMO-003', 'OIL-DEMO-005', 'OIL-DEMO-007'],
  'OIL-DEMO-005': ['OIL-DEMO-002', 'OIL-DEMO-003', 'OIL-DEMO-004', 'OIL-DEMO-007'],
};

function getOffsetWells(selectedWellId) {
  const selectedWell = DASHBOARD_WELLS.find((well) => well.wellId === selectedWellId);
  const sourceWells = NEARBY_WELLS_DATA.map((well) => ({ ...well }));
  if (selectedWell && selectedWellId === 'OIL-DEMO-001') {
    sourceWells.push({
      id: selectedWell.wellId,
      distanceKm: 0,
      totalDepth: selectedWell.totalDepth,
      formation: selectedWell.formation,
      status: selectedWell.status,
      riskLevel: 'MEDIUM',
      historicalEvents: [],
    });
  }

  return (OFFSET_WELL_IDS[selectedWellId] || []).map((wellId) => sourceWells.find((well) => well.id === wellId)).filter(Boolean);
}

export default function OffsetWellSummary({ selectedWellId = 'OIL-DEMO-001' }) {
  const [activeCategory, setActiveCategory] = useState(null);
  const nearbyWells = useMemo(() => getOffsetWells(selectedWellId), [selectedWellId]);
  const highRiskWells = nearbyWells.filter((well) => well.riskLevel === 'HIGH');
  const historicalEvents = nearbyWells.flatMap((well) => well.historicalEvents.map((event) => ({ ...event, wellId: well.id, formation: well.formation })));
  const categoryData = { nearby: nearbyWells, highRisk: highRiskWells, historical: historicalEvents };

  const metrics = [
    { key: 'nearby', label: 'Nearby Wells', value: nearbyWells.length, suffix: 'wells' },
    { key: 'highRisk', label: 'High Risk Wells', value: highRiskWells.length, suffix: 'wells' },
    { key: 'historical', label: 'Historical Events', value: historicalEvents.length, suffix: 'logs' },
  ];

  return (
    <div className="bg-white dark:bg-[#101012] border border-[#E5E8E6] dark:border-white/[0.08] hover:border-[#D6DAD8] dark:hover:border-white/[0.14] rounded-[12px] p-5 sm:p-6 h-full flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.035)] transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E8E6] dark:border-white/[0.06] mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F0F2F1] dark:bg-white/[0.06] flex items-center justify-center text-[#3A403D] dark:text-zinc-200">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-[#111513] dark:text-white tracking-tight">
              Offset Summary
            </h3>
            <p className="text-xs text-[#6F7773] dark:text-zinc-500 font-sans">5 km proximity radius</p>
          </div>
        </div>
        <span className="text-xs text-[#858C89] dark:text-zinc-500 font-mono">Geospatial</span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {metrics.map((metric) => (
          <button
            key={metric.key}
            type="button"
            onClick={() => setActiveCategory(metric.key)}
            className="p-3.5 rounded-lg bg-[#F7F8F7] dark:bg-white/[0.03] border border-[#E5E8E6] dark:border-white/[0.06] flex flex-col justify-between text-left hover:bg-[#F0F2F1] dark:hover:bg-white/[0.06] hover:border-[#D6DAD8] dark:hover:border-white/[0.14] transition-all cursor-pointer"
            aria-label={`View ${metric.label} ${metric.suffix}`}
          >
            <span className="text-xs text-[#555C59] dark:text-zinc-400 font-medium mb-1 flex items-center gap-1">
              {metric.key === 'highRisk' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
              {metric.key === 'historical' && <History className="w-3 h-3 text-[#858C89] dark:text-zinc-400" />}
              {metric.label}
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl sm:text-2xl font-bold font-sans ${metric.key === 'highRisk' ? 'text-amber-600 dark:text-amber-400' : 'text-[#111513] dark:text-white'}`}>{metric.value}</span>
              <span className="text-[10px] text-[#858C89] dark:text-zinc-500 font-mono">{metric.suffix}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Action Button */}
      <div className="pt-3 border-t border-[#E5E8E6] dark:border-white/[0.06]">
        <Link
          to="/nearby-wells"
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#111513] hover:bg-[#232725] text-white font-semibold text-xs shadow-sm transition-all"
          style={{ color: '#ffffff' }}
        >
          <span className="text-white font-semibold text-xs tracking-wide" style={{ color: '#ffffff' }}>
            Explore Nearby Wells
          </span>
          <ArrowRight className="w-4 h-4 text-white shrink-0" style={{ color: '#ffffff' }} />
        </Link>
      </div>

      {activeCategory && <OffsetDetailsModal category={activeCategory} data={categoryData[activeCategory]} onClose={() => setActiveCategory(null)} />}
    </div>
  );
}
