import React, { useState, useEffect } from 'react';
import PageHeader from '../components/layout/PageHeader';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { getCurrentRisks, getRiskHistory, getRiskEvidence } from '../services/riskApi';
import {
  AlertTriangle,
  Flame,
  Gauge,
  Radio,
  Sparkles,
  Layers,
  RefreshCw,
  AlertOctagon,
} from 'lucide-react';
import WellSelector from '../components/common/WellSelector';
import { useWellContext } from '../context/WellContext';

const RISK_LEVEL_STYLES = {
  HIGH: {
    badge: 'bg-red-950/80 text-red-400 border-red-800/80',
    indicator: 'bg-red-500',
    border: 'border-l-4 border-l-red-500',
  },
  MEDIUM: {
    badge: 'bg-amber-950/80 text-amber-400 border-amber-800/80',
    indicator: 'bg-amber-500',
    border: 'border-l-4 border-l-amber-500',
  },
  LOW: {
    badge: 'bg-green-950/80 text-green-400 border-green-800/80',
    indicator: 'bg-green-500',
    border: 'border-l-4 border-l-green-500',
  },
};

export default function RiskIntelligence() {
  const { selectedWellId, selectedWell } = useWellContext();
  const [currentRisks, setCurrentRisks] = useState(null);
  const [riskHistory, setRiskHistory] = useState(null);
  const [evidenceList, setEvidenceList] = useState([]);
  const [isBackendLive, setIsBackendLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRiskData();
  }, [selectedWellId]);

  const fetchRiskData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [currentRes, historyRes, evidenceRes] = await Promise.all([
        getCurrentRisks(selectedWellId),
        getRiskHistory(selectedWellId),
        getRiskEvidence(selectedWellId),
      ]);

      setCurrentRisks(currentRes);
      setRiskHistory(historyRes);
      setEvidenceList(evidenceRes.evidence || []);
      setIsBackendLive(currentRes.isBackendLive || historyRes.isBackendLive);
    } catch (err) {
      console.error('Failed to load risk intelligence:', err);
      setError('Unable to load risk models. Please check telemetry connectivity.');
    } finally {
      setLoading(false);
    }
  };

  // 4 Primary Risk Cards Data
  const primaryRisks = (currentRisks?.risks || []).map((risk, index) => ({ ...risk, id: `risk-${index}`, depth: `${risk.depth.toLocaleString()} m`, evidenceCount: risk.count, icon: [AlertTriangle, Layers, Flame, Gauge][index] || AlertTriangle }));

  // "Correlated Offsets" and "Depth Corridor" used to be hardcoded ("3 Wells" / "2,800 - 2,900 m")
  // regardless of well, filters, or whether live data was even available. Derive them from the
  // real offset-well evidence records instead, so the banner reflects the well actually selected.
  const correlatedOffsetCount = new Set(evidenceList.map((item) => item.well)).size;
  const evidenceDepths = evidenceList.map((item) => item.depth).filter((d) => typeof d === 'number');
  const depthCorridorLabel = evidenceDepths.length
    ? `${Math.min(...evidenceDepths).toLocaleString()} - ${Math.max(...evidenceDepths).toLocaleString()} m`
    : 'No offset evidence yet';

  if (loading) {
    return <LoadingState message="Calculating formation risk telemetry and offset correlations..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchRiskData} />;
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <PageHeader
        title="Risk Intelligence"
        subtitle="Monitor current drilling conditions and identify potential risks using historical offset-well behaviour."
        actions={
          <div className="flex items-center gap-2">
            <WellSelector />
            {/* Distinguish backend response vs DEMO fallback data */}
            <span
              className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase border ${
                isBackendLive
                  ? 'bg-blue-950/80 text-blue-400 border-blue-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isBackendLive ? 'API LIVE RESPONSE' : 'DEMO RISK MODEL'}
            </span>

            <button
              type="button"
              onClick={fetchRiskData}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
              title="Refresh risks"
            >
              <RefreshCw className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* Active Well Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-sm p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-blue-950/80 border border-blue-800/80 flex items-center justify-center text-blue-400 shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100 font-mono">{selectedWell.wellId}</span>
              {selectedWell.status === 'LIVE' ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-blue-950/80 text-blue-400 border border-blue-800/70 text-[10px] font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  LIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono font-bold uppercase">
                  {selectedWell.status || 'HISTORICAL'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
                <span>Formation: <strong className="text-slate-300">{selectedWell.formation}</strong></span>
              <span>·</span>
                <span>Current Depth: <strong className="text-blue-400">{selectedWell.currentDepth.toLocaleString()} m</strong></span>
            </div>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3 bg-slate-950/60 px-3 py-1.5 rounded-sm border border-slate-800">
          <span>Correlated Offsets: <strong className="text-slate-200">{correlatedOffsetCount} {correlatedOffsetCount === 1 ? 'Well' : 'Wells'}</strong></span>
          <span>·</span>
          <span>Depth Corridor: <strong className="text-slate-200">{depthCorridorLabel}</strong></span>
        </div>
      </div>

      {/* 4 Main Risk Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {primaryRisks.map((risk) => {
          const style = RISK_LEVEL_STYLES[risk.level] || RISK_LEVEL_STYLES.MEDIUM;
          const Icon = risk.icon;

          return (
            <div
              key={risk.id}
              className={`bg-slate-900 border rounded-sm p-3.5 flex flex-col justify-between ${style.border} border-slate-800 space-y-3`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-4 h-4 text-slate-300" />
                    <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      {risk.name}
                    </h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase border ${style.badge}`}>
                    {risk.level}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono my-2.5">
                  <div className="p-1.5 rounded-sm bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Confidence</span>
                    <strong className="text-slate-200">{risk.confidence}</strong>
                  </div>
                  <div className="p-1.5 rounded-sm bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Depth</span>
                    <strong className="text-blue-400">{risk.depth}</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-snug">
                  {risk.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Related historical events:</span>
                <span className="text-slate-300 font-bold">{risk.evidenceCount}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historical Offset Evidence & Correlated Events Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Offset Risk Evidence & Historical Incidents
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Ground-truth records from adjacent bores
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Hazard Type</th>
                <th className="py-2.5 px-3">Offset Well</th>
                <th className="py-2.5 px-3">Historical Depth</th>
                <th className="py-2.5 px-3">Documented Incident</th>
                <th className="py-2.5 px-3">Similarity</th>
                <th className="py-2.5 px-3">Source Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {evidenceList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-200 whitespace-nowrap">
                    {item.risk}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                    {item.well}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-blue-400 whitespace-nowrap">
                    {item.depth} m
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 max-w-sm">
                    {item.event}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded-sm bg-blue-950/60 border border-blue-800/70 text-blue-300 font-mono text-[10px]">
                      {item.similarity}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                    {item.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Reference Notice */}
      <div className="bg-slate-900 border border-slate-800 rounded-sm p-2.5 space-y-1.5">
        <div className="flex items-center gap-2 text-[11px] font-bold text-amber-400 uppercase font-mono leading-snug">
          <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
          <span>HISTORICAL OFFSET REFERENCE — ARCHIVAL DRILLING BEHAVIOUR</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed m-0">
          Historical patterns for <strong className="text-slate-200">{selectedWell.wellId}</strong> are demo references only. Operational parameter adjustments must be verified against real-time downhole pressure while drilling (PWD) data and signed off by the rig superintendent.
        </p>
      </div>
    </div>
  );
}
