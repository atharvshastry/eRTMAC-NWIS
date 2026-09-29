import React from 'react';
import { BookOpen, AlertOctagon, CheckCircle2, FileText, Compass, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RecommendationPanel({
  recommendation,
  wellId = 'OIL-DEMO-001',
}) {
  if (!recommendation) {
    return (
      <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-sm text-xs text-slate-500 font-mono text-center">
        No historical recommendations available for this alert.
      </div>
    );
  }

  const {
    historicalEvent,
    historicalObservation,
    historicalMitigation,
    outcome,
    sourceWell,
    sourceDocument,
  } = recommendation;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden space-y-2">
      {/* Header Banner */}
      <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Historical Reference
          </h4>
        </div>

        {/* Mandatory Non-Instruction Disclaimer Badge */}
        <span className="px-2 py-0.5 rounded-sm bg-amber-950/80 text-amber-400 border border-amber-800/80 text-[9px] font-mono font-bold tracking-tight uppercase inline-flex items-center gap-1">
          <AlertOctagon className="w-3 h-3 text-amber-400 shrink-0" />
          HISTORICAL REFERENCE — NOT AN OPERATIONAL INSTRUCTION
        </span>
      </div>

      <div className="p-3 space-y-2">
        {/* Advisory Context Notice */}
        <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/70 p-2 rounded-sm border border-slate-800/80">
          <span className="text-slate-500 font-mono font-semibold block mb-0.5 uppercase text-[10px]">
            ARCHIVAL CONTEXT NOTE
          </span>
          This record outlines mitigation actions documented during offset operations on well{' '}
          <strong className="text-slate-200">{sourceWell}</strong>. Actual rig site adjustments require drilling superintendent approval and live formation verification.
        </div>

        {/* Structured Field Cards */}
        <div className="space-y-1.5 text-xs">
          {/* Historical Event */}
          <div className="p-2 bg-slate-950/50 rounded-sm border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono uppercase block mb-0.5">
              Historical Event
            </span>
            <div className="text-slate-200 font-medium">{historicalEvent}</div>
          </div>

          {/* Historical Observation */}
          <div className="p-2 bg-slate-950/50 rounded-sm border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono uppercase block mb-0.5">
              Historical Observation
            </span>
            <div className="text-slate-300 leading-relaxed">{historicalObservation}</div>
          </div>

          {/* Historical Mitigation */}
          <div className="p-2 bg-blue-950/30 rounded-sm border border-blue-900/50">
            <span className="text-[10px] text-blue-400 font-mono uppercase font-semibold block mb-0.5">
              Historical Mitigation Action Taken
            </span>
            <div className="text-slate-100 font-medium leading-relaxed">
              {historicalMitigation}
            </div>
          </div>

          {/* Outcome */}
          <div className="p-2 bg-green-950/20 rounded-sm border border-green-900/40">
            <span className="text-[10px] text-green-400 font-mono uppercase font-semibold block mb-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              Recorded Operational Outcome
            </span>
            <div className="text-slate-200 leading-relaxed">{outcome}</div>
          </div>
        </div>

        {/* Source References Footer */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <span>Source Well: <strong className="text-slate-200">{sourceWell}</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Doc: <span className="text-slate-300">{sourceDocument}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
