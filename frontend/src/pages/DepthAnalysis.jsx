import React, { useEffect, useRef, useState } from 'react';
import { Compass, Play, Pause, Bell, Gauge, MapPin } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { useWellContext } from '../context/WellContext';
import DepthRiskChart from '../components/depth/DepthRiskChart';
import StratigraphyColumn from '../components/depth/StratigraphyColumn';
import IncidentRegister from '../components/depth/IncidentRegister';

const DEMO_START = 2650;
const DEMO_END = 2850;
const DEMO_STEP_M = 5;
const DEMO_INTERVAL_MS = 350;

const STATUS_DISPLAY = {
  LIVE: { label: 'DRILLING', dot: 'bg-emerald-400', pulse: true, suffix: ' (28.5° DEV)' },
  Producing: { label: 'PRODUCING', dot: 'bg-emerald-500', pulse: false, suffix: '' },
  Suspended: { label: 'SUSPENDED', dot: 'bg-amber-400', pulse: false, suffix: '' },
  Abandoned: { label: 'ABANDONED', dot: 'bg-zinc-500', pulse: false, suffix: '' },
};

export default function DepthAnalysis() {
  const { selectedWell } = useWellContext();

  const [currentDepth, setCurrentDepth] = useState(selectedWell.currentDepth);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [hoveredLayer, setHoveredLayer] = useState(null);
  const [hoveredIncident, setHoveredIncident] = useState(null);
  const demoTimerRef = useRef(null);

  const stopDemo = () => {
    window.clearInterval(demoTimerRef.current);
    demoTimerRef.current = null;
    setIsDemoRunning(false);
  };

  // Reset to the real selected well whenever it changes elsewhere in the app.
  useEffect(() => {
    stopDemo();
    setCurrentDepth(selectedWell.currentDepth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWell.wellId]);

  useEffect(() => () => window.clearInterval(demoTimerRef.current), []);

  const handleToggleDemo = () => {
    if (isDemoRunning) {
      stopDemo();
      setCurrentDepth(selectedWell.currentDepth);
      return;
    }
    setIsDemoRunning(true);
    setCurrentDepth(DEMO_START);
    demoTimerRef.current = window.setInterval(() => {
      setCurrentDepth((prev) => {
        const next = prev + DEMO_STEP_M;
        if (next >= DEMO_END) {
          window.clearInterval(demoTimerRef.current);
          demoTimerRef.current = null;
          setIsDemoRunning(false);
          return DEMO_END;
        }
        return next;
      });
    }, DEMO_INTERVAL_MS);
  };

  const handleSelectLayer = (layer) => {
    stopDemo();
    setCurrentDepth(Math.round((layer.depthStart + layer.depthEnd) / 2));
  };

  const handleSelectDepth = (depth) => {
    stopDemo();
    setCurrentDepth(depth);
  };

  const highlightRange = hoveredLayer
    ? { start: hoveredLayer.depthStart, end: hoveredLayer.depthEnd }
    : hoveredIncident
      ? { start: hoveredIncident.depth - 15, end: hoveredIncident.depth + 15 }
      : null;

  const status = STATUS_DISPLAY[selectedWell.status] || STATUS_DISPLAY.Producing;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Depth Analysis"
        subtitle="Continuous depth-wise multi-risk trajectory across regional stratigraphy, cross-linked with offset well incidents."
      />

      {/* Sub-header control bar — same always-dark banner treatment as the Dashboard's Active Well card */}
      <div className="bg-[#101012] border border-white/[0.08] hover:border-white/[0.14] rounded-[22px] p-5 sm:p-6 text-zinc-200 transition-all duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-2.5">
              <div className="icon-squircle">
                <Compass className="w-5 h-5 text-zinc-200" />
              </div>
              <div>
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider block leading-tight">Active Well</span>
                <span className="text-sm sm:text-base font-bold text-white font-mono tracking-tight">{selectedWell.wellId}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <Gauge className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <span className="text-[10px] text-zinc-500 block leading-tight">Depth</span>
                <span className="text-xs sm:text-sm font-bold text-white font-mono">{Math.round(currentDepth).toLocaleString()} m</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className={`w-2 h-2 rounded-full ${status.dot} ${status.pulse ? 'animate-pulse' : ''}`} />
              <span className="text-xs sm:text-sm font-semibold text-zinc-200">{status.label}{status.suffix}</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="text-[11px] font-mono text-zinc-400">
                {selectedWell.latitude.toFixed(4)}&deg;N | {selectedWell.longitude.toFixed(4)}&deg;E
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleDemo}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[11.5px] font-bold px-3.5 py-2 transition-colors shadow-[0_0_12px_rgba(6,182,212,0.25)]"
            >
              {isDemoRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isDemoRunning ? 'PAUSE DEMO' : 'RUN DEMO'}
            </button>
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-400">
              <Bell className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-[10.5px] font-semibold text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              DEMO MODE
            </span>
          </div>
        </div>
      </div>

      {/* Main trajectory chart */}
      <DepthRiskChart currentDepth={currentDepth} highlightRange={highlightRange} />

      {/* Two-column intelligence grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StratigraphyColumn
          currentDepth={currentDepth}
          hoveredLayerId={hoveredLayer?.id || null}
          onHoverLayer={setHoveredLayer}
          onSelectLayer={handleSelectLayer}
        />
        <IncidentRegister
          hoveredIncidentId={hoveredIncident?.id || null}
          onHoverIncident={setHoveredIncident}
          onSelectDepth={handleSelectDepth}
        />
      </div>

      {/* Telemetry verification footer */}
      <div className="bg-white dark:bg-[#101012] border border-[#E5E8E6] dark:border-white/[0.08] rounded-[12px] px-4 sm:px-6 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.035)] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
        <div className="flex flex-wrap items-center gap-4 text-[#6F7773] dark:text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ANALOGUES: VALIDATED
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> SEISMIC FAULT INVERSION: VALIDATED
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> OFFSET DATA RETRIEVAL: 100% SYNCHRONIZED
          </span>
        </div>
        <span className="text-[#111513] dark:text-zinc-300 font-semibold">
          PLANNED TD: {selectedWell.totalDepth.toLocaleString()} m
        </span>
      </div>
    </div>
  );
}
