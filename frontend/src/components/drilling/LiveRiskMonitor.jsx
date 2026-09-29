import React from 'react';
import { ShieldAlert } from 'lucide-react';

const STATUS_STYLES = {
  normal: {
    dot: 'bg-[#10B981]',
    text: 'text-[#065F46] dark:text-emerald-300',
    bg: 'bg-[#E7F7F0] dark:bg-emerald-950/40',
    border: 'border-[#A7F3D0] dark:border-emerald-800/40',
    label: 'Normal',
    textColor: '#065F46',
  },
  monitoring: {
    dot: 'bg-[#F59E0B]',
    text: 'text-[#92400E] dark:text-amber-300',
    bg: 'bg-[#FEF3C7] dark:bg-amber-950/40',
    border: 'border-[#FDE68A] dark:border-amber-800/40',
    label: 'Monitoring',
    textColor: '#92400E',
  },
  critical: {
    dot: 'bg-[#EF4444]',
    text: 'text-[#991B1B] dark:text-rose-300',
    bg: 'bg-[#FCEAEA] dark:bg-rose-950/40',
    border: 'border-[#FECDD3] dark:border-rose-800/40',
    label: 'Critical',
    textColor: '#991B1B',
  },
};

export default function LiveRiskMonitor({ risks = [] }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-[#E5E8E6] dark:border-slate-800 rounded-sm p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-[#E5E8E6] dark:border-slate-800 mb-3">
        <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <h3 className="text-xs font-bold text-[#111513] dark:text-slate-100 uppercase tracking-wider font-mono">
          Live Risk Monitor
        </h3>
      </div>

      {/* Risk Items */}
      <div className="space-y-1.5">
        {risks.map((risk) => {
          const style = STATUS_STYLES[risk.status] || STATUS_STYLES.normal;
          return (
            <div
              key={risk.key}
              className={`flex items-center justify-between px-2.5 py-2 rounded-sm border ${style.bg} ${style.border} transition-colors duration-300`}
            >
              <span className="text-xs font-mono font-bold text-[#111513] dark:text-slate-100">
                {risk.label}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                <span 
                  className={`text-[11px] font-mono font-bold ${style.text}`}
                >
                  {style.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer legend */}
      <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-[#E5E8E6] dark:border-slate-800 text-[10px] font-mono text-[#475569] dark:text-slate-400 font-medium">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          <span>Monitoring</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
          <span>Critical</span>
        </div>
      </div>
    </div>
  );
}
