import React from 'react';
import PageHeader from '../components/layout/PageHeader';
import ActiveWellCard from '../components/dashboard/ActiveWellCard';
import KPICard from '../components/dashboard/KPICard';
import RiskOverview from '../components/dashboard/RiskOverview';
import RecentAlerts from '../components/dashboard/RecentAlerts';
import DrillingTrend from '../components/dashboard/DrillingTrend';
import OffsetWellSummary from '../components/dashboard/OffsetWellSummary';
import WellSelector from '../components/common/WellSelector';
import { useWellContext } from '../context/WellContext';

export default function Dashboard() {
  const { selectedWell } = useWellContext();

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <PageHeader
        title="Operations Dashboard"
        subtitle="Real-time drilling telemetry, subsurface risk correlation, and offset well benchmarks for active rig operations."
        actions={<WellSelector />}
      />

      {/* 1. TOP: Active Well Header */}
      <ActiveWellCard
        wellName={selectedWell.wellId}
        status={selectedWell.status}
        currentDepth={`${selectedWell.currentDepth.toLocaleString()} m`}
        formation={selectedWell.formation}
        field={selectedWell.field}
      />

      {/* 2. NEXT: KPI Cards (9 boxes: Current Depth, ROP, WOB, Torque, RPM, Mud Flow, Standpipe Pressure, Mud Weight, ECD) - compact horizontally sliding strip */}
      <div className="bg-white dark:bg-[#111215] border border-[#E5E8E6] dark:border-white/[0.09] rounded-[12px] p-2.5 sm:p-3 shadow-[0_1px_2px_rgba(0,0,0,0.035)]">
        <div className="flex gap-2.5 sm:gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#D6DAD8] dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          {selectedWell.kpis.map(([label, value, unit, trend, trendDirection, trendLabel]) => (
            <div key={label} className="snap-start shrink-0 w-[172px] sm:w-[186px]">
              <KPICard
                label={label}
                value={value}
                unit={unit}
                trend={trend}
                trendDirection={trendDirection}
                trendLabel={trendLabel}
                targetDepth={`${selectedWell.totalDepth ? selectedWell.totalDepth.toLocaleString() : '2,980'} m`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 3. MIDDLE: Drilling Trend (2/3) + Current Risk Overview (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DrillingTrend data={selectedWell.drillingHistory} wellId={selectedWell.wellId} />
        </div>
        <div className="lg:col-span-1">
          <RiskOverview risks={selectedWell.risks} />
        </div>
      </div>

      {/* 4. BOTTOM: Operational Alerts followed by Offset Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <RecentAlerts key={selectedWell.wellId} alerts={selectedWell.alerts} />
        </div>
        <div>
          <OffsetWellSummary selectedWellId={selectedWell.wellId} />
        </div>
      </div>

      {/* 5. Well Information Footer Box */}
      <div className="bg-white dark:bg-[#101012] border border-[#E5E8E6] dark:border-white/[0.08] rounded-[12px] p-5 sm:p-6 text-xs text-[#555C59] dark:text-zinc-300 shadow-[0_1px_3px_rgba(0,0,0,0.035)]">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E8E6] dark:border-white/[0.06] mb-4">
          <h3 className="text-sm sm:text-base font-semibold text-[#111513] dark:text-white">Well Information</h3>
          <span className="font-mono text-[#858C89] dark:text-zinc-500">{selectedWell.wellId}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Field', selectedWell.field],
            ['Status', selectedWell.status],
            ['Latitude', `${selectedWell.latitude.toFixed(4)}°N`],
            ['Longitude', `${selectedWell.longitude.toFixed(4)}°E`],
            ['Spud Date', selectedWell.spudDate],
            ['Total Depth', `${selectedWell.totalDepth.toLocaleString()} m`],
            ['Current Depth', `${selectedWell.currentDepth.toLocaleString()} m`],
            ['Formation', selectedWell.formation],
          ].map(([label, value]) => (
            <div key={label}>
              <span className="block text-[#858C89] dark:text-zinc-500 mb-1">{label}</span>
              <span className="font-medium text-[#111513] dark:text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
