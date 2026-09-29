import React from 'react';
import PageHeader from '../components/layout/PageHeader';
import { Database, Gauge, Layers, Pause, Play } from 'lucide-react';

import LiveParameterCard from '../components/drilling/LiveParameterCard';
import DrillingCharts from '../components/drilling/DrillingCharts';
import FormationStatus from '../components/drilling/FormationStatus';
import OffsetComparison from '../components/drilling/OffsetComparison';
import LiveRiskMonitor from '../components/drilling/LiveRiskMonitor';
import LiveEventStream from '../components/drilling/LiveEventStream';
import DrillingCrossSection from '../components/drilling/DrillingCrossSection';
import Trajectory3D from '../components/drilling/Trajectory3D';

import {
  parameterDefs,
  getLiveWellConfig,
} from '../data/mockLiveDrilling';

import useLiveSimulation from '../hooks/useLiveSimulation';
import WellSelector from '../components/common/WellSelector';
import { useWellContext } from '../context/WellContext';

export default function LiveOperations() {
  const { selectedWellId } = useWellContext();
  const selectedConfig = getLiveWellConfig(selectedWellId);
  const {
    params,
    chartData,
    risks,
    events,
    paused,
    togglePause,
    secondsAgo,
    isBackendLive,
  } = useLiveSimulation(selectedWellId);

  return (
    <div className="space-y-4">
      {/* ───── Page Header ───── */}
      <PageHeader
        title="Live Operations"
        subtitle="Real-time drilling parameter monitoring, offset comparison, and live risk assessment."
        actions={
          <div className="flex items-center gap-3">
            <WellSelector />
            {/* Dynamic LIVE DATA vs DEMO LIVE DATA indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-mono border ${
                isBackendLive
                  ? 'bg-blue-950/80 border-blue-600 text-blue-300'
                  : 'bg-amber-950/60 border-amber-800/80 text-amber-300'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                    isBackendLive ? 'bg-blue-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isBackendLive ? 'bg-blue-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span className="font-bold tracking-wider uppercase">
                {isBackendLive ? 'LIVE DATA' : 'DEMO LIVE DATA'}
              </span>
            </div>
          </div>
        }
      />

      {/* ───── Active Well Header ───── */}
      <div className="bg-slate-900 border border-slate-800 rounded-sm p-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left: Well ID + Status */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-blue-950 border border-blue-800/80 flex items-center justify-center text-blue-400 shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Active Well</span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-slate-950 border border-slate-800 text-[10px] font-mono text-emerald-400">
                  <span className="text-emerald-500 text-xs leading-none">●</span>
                  <span className="font-semibold">{selectedConfig.activeWell.status}</span>
                </div>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 font-mono tracking-tight">
                {selectedConfig.activeWell.id}
              </h2>
            </div>
          </div>

          {/* Right: Telemetry Fields */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800 text-xs">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-slate-950 border border-slate-800">
              <Gauge className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 font-mono block leading-none">Current Depth</span>
                <span className="text-xs sm:text-sm font-bold text-slate-100 font-mono">
                  {params.depth?.toLocaleString('en-US', { maximumFractionDigits: 1 })} m
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-slate-950 border border-slate-800">
              <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 font-mono block leading-none">Formation</span>
                <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate block">
                  {selectedConfig.activeWell.formation}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───── Simulation Controls ───── */}
      <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
        <button
          onClick={togglePause}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          <span>{paused ? 'Resume' : 'Pause'}</span>
        </button>
        <span className="text-slate-500">
          Last updated: <span className="text-slate-300">{secondsAgo} sec ago</span>
        </span>
      </div>

      {/* ───── Live Drilling Parameters (10 cards) ───── */}
      <div>
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
          Live Drilling Parameters
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {parameterDefs.map((def) => (
            <LiveParameterCard
              key={def.key}
              label={def.label}
              value={params[def.key]}
              unit={def.unit}
              history={chartData[def.key] || []}
            />
          ))}
        </div>
      </div>

      {/* ───── Drilling Cross-Section (pace tracks real ROP when the backend is live) ───── */}
      <DrillingCrossSection wellId={selectedWellId} liveRopMHr={params.rop} liveDepthM={params.depth} isLive={isBackendLive} />

      {/* ───── 3D Wellbore Trajectory (real survey data, active + nearest offsets) ───── */}
      <Trajectory3D />

      {/* ───── Real-Time Drilling Charts ───── */}
      <DrillingCharts chartData={chartData} />

      {/* ───── Bottom Row: Formation + Offset | Risk Monitor + Events ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2/3: Formation + Offset */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormationStatus formation={selectedConfig.formationData} />
            <OffsetComparison data={selectedConfig.offsetWells} />
          </div>
        </div>

        {/* Right 1/3: Risk + Events */}
        <div className="lg:col-span-1 space-y-4">
          <LiveRiskMonitor risks={risks} />
          <LiveEventStream events={events} />
        </div>
      </div>
    </div>
  );
}
