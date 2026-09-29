import React from 'react';
import { Clock } from 'lucide-react';
import { OFFSET_INCIDENTS_DATA } from '../../data/mockDepthRisk';

const SEVERITY_STYLES = {
  CRITICAL: 'bg-[#FCEAEA] text-[#C52222] border border-[#FECDD3] dark:bg-rose-950/60 dark:text-[#F87171] dark:border-rose-800/50',
  HIGH: 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/30',
  MEDIUM: 'bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A] dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800/30',
  LOW: 'bg-[#F0F2F1] text-[#555C59] border border-[#E5E8E6] dark:bg-white/[0.08] dark:text-zinc-300 dark:border-white/[0.1]',
};

export default function IncidentRegister({ hoveredIncidentId, onHoverIncident, onSelectDepth }) {
  return (
    <div className="bg-white dark:bg-[#101012] border border-[#E5E8E6] dark:border-white/[0.08] hover:border-[#D6DAD8] dark:hover:border-white/[0.14] rounded-[12px] p-5 sm:p-6 h-full shadow-[0_1px_3px_rgba(0,0,0,0.035)] transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E8E6] dark:border-white/[0.06] mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F0F2F1] dark:bg-white/[0.06] flex items-center justify-center text-[#3A403D] dark:text-zinc-200 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-[#111513] dark:text-white tracking-tight">
              Offset Drilling Incident Register
            </h3>
            <p className="text-xs text-[#6F7773] dark:text-zinc-500 font-sans">Historical offset well events, indexed by depth</p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-[#858C89] dark:text-zinc-500 font-mono shrink-0">Depth-Indexed</span>
      </div>

      <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1 scrollbar-none">
        {OFFSET_INCIDENTS_DATA.map((incident) => {
          const isHovered = hoveredIncidentId === incident.id;
          return (
            <div
              key={incident.id}
              onMouseEnter={() => onHoverIncident?.(incident)}
              onMouseLeave={() => onHoverIncident?.(null)}
              onClick={() => onSelectDepth?.(incident.depth)}
              className={`rounded-lg border p-3 cursor-pointer transition-all text-xs ${
                isHovered
                  ? 'bg-[#E0F7FA] border-[#A5E9F5] dark:bg-cyan-950/20 dark:border-cyan-800/30'
                  : 'bg-[#F7F8F7] dark:bg-white/[0.03] border-[#E5E8E6] dark:border-white/[0.06] hover:border-[#D6DAD8] dark:hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold font-mono text-[#0E7490] dark:text-cyan-400">
                  {incident.wellId} @ {incident.depth.toLocaleString()} m
                </span>
                <span className={`shrink-0 px-2 py-0.5 rounded-full font-semibold text-[10px] tracking-tight ${SEVERITY_STYLES[incident.severity] || SEVERITY_STYLES.LOW}`}>
                  {incident.severity}
                </span>
              </div>
              <p className="text-[11.5px] text-[#4B5250] dark:text-zinc-300 mt-1.5 leading-relaxed">{incident.description}</p>
              <div className="mt-2 rounded bg-[#E7F7F0] dark:bg-emerald-950/30 border border-[#C6F0DF] dark:border-emerald-800/30 px-2.5 py-1.5 text-[10.5px] text-[#1E9E67] dark:text-emerald-300">
                <span className="font-bold text-[#0D7A4D] dark:text-emerald-400">Remedial Action:</span> {incident.remedialAction}
              </div>
              <div className="flex items-center justify-between mt-2 text-[10.5px] font-mono">
                <span className="text-[#858C89] dark:text-zinc-500">Formation: {incident.formation}</span>
                <span className="text-[#D97706] dark:text-amber-400 font-semibold">NPT Impact: {incident.nptImpact}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
