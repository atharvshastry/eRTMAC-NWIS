import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import LoadingState from '../components/common/LoadingState';
import { FlaskConical, Play, TrendingDown, TrendingUp, Minus, AlertOctagon, Info } from 'lucide-react';
import { getWellCatalog, getWhatIf } from '../services/whatifApi';

const BAND_STYLES = {
  HIGH: { badge: 'bg-red-950/80 text-red-400 border-red-800/80', border: 'border-l-4 border-l-red-500' },
  MEDIUM: { badge: 'bg-amber-950/80 text-amber-400 border-amber-800/80', border: 'border-l-4 border-l-amber-500' },
  LOW: { badge: 'bg-green-950/80 text-green-400 border-green-800/80', border: 'border-l-4 border-l-green-500' },
};

function RiskList({ title, risks, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-3.5 space-y-2.5 flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className={`text-xs font-bold uppercase tracking-wider ${accent}`}>{title}</h3>
        <span className="text-[10px] font-mono text-slate-500">{risks.length} alert{risks.length === 1 ? '' : 's'}</span>
      </div>
      {risks.length === 0 ? (
        <p className="text-[11px] text-slate-500 font-mono py-2">No alerts at or above the selected band.</p>
      ) : (
        <div className="space-y-2">
          {risks.map((r) => {
            const style = BAND_STYLES[r.level] || BAND_STYLES.LOW;
            return (
              <div key={r.id} className={`bg-slate-950/60 border border-slate-800 rounded-sm p-2.5 ${style.border}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-100">{r.name}</span>
                  <span className={`px-1.5 py-0.5 rounded-sm text-[9.5px] font-mono font-bold uppercase border ${style.badge}`}>{r.level}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10.5px] font-mono text-slate-400">
                  <span>Depth <strong className="text-blue-400">{r.depth} m</strong></span>
                  <span>Confidence <strong className="text-slate-200">{r.confidence}</strong></span>
                  <span>Evidence <strong className="text-slate-200">{r.count}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function bandRank(level) { return { HIGH: 3, MEDIUM: 2, LOW: 1 }[level] || 0; }

function ComparisonRow({ name, baselineRisk, whatifRisk }) {
  const b = bandRank(baselineRisk?.level);
  const w = bandRank(whatifRisk?.level);
  const Icon = w < b ? TrendingDown : w > b ? TrendingUp : Minus;
  const color = w < b ? 'text-green-400' : w > b ? 'text-red-400' : 'text-slate-500';
  return (
    <tr className="hover:bg-slate-800/40 transition-colors">
      <td className="py-2 px-3 font-semibold text-slate-200 whitespace-nowrap">{name}</td>
      <td className="py-2 px-3 font-mono text-slate-400">{baselineRisk ? baselineRisk.level : '—'}</td>
      <td className="py-2 px-3 font-mono text-slate-400">{whatifRisk ? whatifRisk.level : '—'}</td>
      <td className={`py-2 px-3 font-mono flex items-center gap-1 ${color}`}><Icon className="w-3.5 h-3.5" />{w < b ? 'Lower' : w > b ? 'Higher' : 'Same'}</td>
    </tr>
  );
}

export default function WhatIfSimulator() {
  const [wells, setWells] = useState([]);
  const [wellId, setWellId] = useState('');
  const [depth, setDepth] = useState('');
  const [mudWeight, setMudWeight] = useState('');
  const [casingDepth, setCasingDepth] = useState('');
  const [bitType, setBitType] = useState('');
  const [minBand, setMinBand] = useState('LOW');
  const [result, setResult] = useState(null);
  const [loadingWells, setLoadingWells] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoadingWells(true);
      const catalog = await getWellCatalog();
      setWells(catalog || []);
      const preferred = (catalog || []).find((w) => w.status === 'ACTIVE') || (catalog || [])[0];
      if (preferred) {
        setWellId(preferred.wellId);
        setDepth(preferred.actualTdM ? Math.round(preferred.actualTdM * 0.55) : 1500);
      }
      setLoadingWells(false);
    })();
  }, []);

  const selectedWell = useMemo(() => wells.find((w) => w.wellId === wellId), [wells, wellId]);

  const runSimulation = async () => {
    if (!wellId || !depth) return;
    setRunning(true);
    setError(null);
    const res = await getWhatIf(wellId, {
      depth, mudWeight, casingDepth, bitType, minBand, lookahead: 200, radius: 40,
    });
    setRunning(false);
    if (!res || res.isBackendLive === false) {
      setError('Simulator service unreachable. Confirm the backend and AI service are running, then retry.');
      return;
    }
    setResult(res);
  };

  if (loadingWells) {
    return <LoadingState message="Loading well catalog..." />;
  }

  const baselineByType = new Map((result?.baseline.risks || []).map((r) => [r.name, r]));
  const whatifByType = new Map((result?.whatif.risks || []).map((r) => [r.name, r]));
  const allTypes = Array.from(new Set([...baselineByType.keys(), ...whatifByType.keys()]));

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      <PageHeader
        title="What-If Drilling Simulator"
        subtitle="Test an alternative mud weight, casing setting depth, or bit choice before executing it — compares today's baseline risk against what nearby wells recorded under similar conditions."
        badge="BETA"
      />

      {/* Parameter panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wide space-y-1 block">
            Well
            <select
              value={wellId}
              onChange={(e) => {
                setWellId(e.target.value);
                const w = wells.find((x) => x.wellId === e.target.value);
                if (w?.actualTdM) setDepth(Math.round(w.actualTdM * 0.55));
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-sm px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {wells.map((w) => (
                <option key={w.wellId} value={w.wellId}>{w.name} ({w.status})</option>
              ))}
            </select>
          </label>

          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wide space-y-1 block">
            Depth (m MD)
            <input
              type="number"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-sm px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </label>

          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wide space-y-1 block">
            Proposed mud weight (SG)
            <input
              type="number" step="0.01" placeholder="e.g. 1.20"
              value={mudWeight}
              onChange={(e) => setMudWeight(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-sm px-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </label>

          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wide space-y-1 block">
            Proposed casing depth (m)
            <input
              type="number" placeholder="e.g. 900"
              value={casingDepth}
              onChange={(e) => setCasingDepth(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-sm px-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </label>

          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wide space-y-1 block">
            Proposed bit type
            <input
              type="text" placeholder="e.g. PDC"
              value={bitType}
              onChange={(e) => setBitType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-sm px-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </label>

          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wide space-y-1 block">
            Minimum band shown
            <select
              value={minBand}
              onChange={(e) => setMinBand(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-sm px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="LOW">LOW and above</option>
              <option value="MEDIUM">MEDIUM and above</option>
              <option value="HIGH">HIGH only</option>
            </select>
          </label>

          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <button
              type="button"
              onClick={runSimulation}
              disabled={running || !wellId || !depth}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold transition-colors"
            >
              {running ? <FlaskConical className="w-3.5 h-3.5 animate-pulse" /> : <Play className="w-3.5 h-3.5" />}
              {running ? 'Running…' : 'Run Simulation'}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-rose-400 font-mono bg-rose-950/40 border border-rose-900/60 rounded-sm px-3 py-2">
            <AlertOctagon className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
        )}
      </div>

      {result && (
        <>
          {result.note && (
            <div className="flex items-start gap-2 text-xs text-blue-300 font-mono bg-blue-950/40 border border-blue-900/60 rounded-sm px-3 py-2.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {result.note}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-3.5">
            <RiskList title={`Baseline (${result.baseline.offsetsConsidered} offset wells)`} risks={result.baseline.risks} accent="text-slate-300" />
            <RiskList title={`What-If (${result.whatif.offsetsConsidered} offset wells)`} risks={result.whatif.risks} accent="text-blue-400" />
          </div>

          {allTypes.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/80">
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Baseline vs. What-If, by hazard type</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Hazard</th>
                      <th className="py-2.5 px-3">Baseline band</th>
                      <th className="py-2.5 px-3">What-If band</th>
                      <th className="py-2.5 px-3">Direction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {allTypes.map((t) => (
                      <ComparisonRow key={t} name={t} baselineRisk={baselineByType.get(t)} whatifRisk={whatifByType.get(t)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(result.matchedWells?.length > 0 || result.unmatchedWells?.length > 0) && (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-3.5 space-y-2">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Offset wells used for the What-If evidence</h3>
              <div className="flex flex-wrap gap-1.5">
                {result.matchedWells.map((w) => (
                  <span key={w.wellId} className="px-2 py-1 rounded-sm bg-blue-950/60 border border-blue-800/70 text-blue-300 font-mono text-[10.5px]">
                    {w.wellName} · {w.recordedMudWeightSg != null ? `${w.recordedMudWeightSg} SG` : ''}{w.recordedCasingDepthM != null ? ` · ${w.recordedCasingDepthM}m casing` : ''}
                  </span>
                ))}
                {result.unmatchedWells.map((w) => (
                  <span key={w.wellId} className="px-2 py-1 rounded-sm bg-slate-800/60 border border-slate-700 text-slate-500 font-mono text-[10.5px] line-through">
                    {w.wellName}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-sm p-2.5 space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-bold text-amber-400 uppercase font-mono leading-snug">
              <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
              <span>NOT A PHYSICS SIMULATION</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed m-0">{result.caveat}</p>
          </div>
        </>
      )}
    </div>
  );
}
