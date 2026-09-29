import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

const getBadgeClass = (level) => {
  switch (level) {
    case 'HIGH':
      return 'bg-[#FCEAEA] text-[#E84B4B] border border-[#F8D7DA] dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/30';
    case 'MEDIUM':
      return 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/30';
    case 'LOW':
    default:
      return 'bg-[#E7F7F0] text-[#1E9E67] border border-[#C6F0DF] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/30';
  }
};

export default function RiskOverview({ risks = [] }) {
  return (
    <div className="bg-white dark:bg-[#101012] border border-[#E5E8E6] dark:border-white/[0.08] hover:border-[#D6DAD8] dark:hover:border-white/[0.14] rounded-[12px] p-5 sm:p-6 flex flex-col justify-between h-full shadow-[0_1px_3px_rgba(0,0,0,0.035)] transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E8E6] dark:border-white/[0.06] mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F0F2F1] dark:bg-white/[0.06] flex items-center justify-center text-[#3A403D] dark:text-zinc-200">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-[#111513] dark:text-white tracking-tight">
              Risk Overview
            </h3>
            <p className="text-xs text-[#6F7773] dark:text-zinc-500 font-sans">Model-based risk prediction</p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-[#858C89] dark:text-zinc-500 font-mono">Demo Data</span>
      </div>

      {/* Risk Items List */}
      <div className="space-y-2.5 flex-1">
        {risks.map((item) => (
          <div
            key={item.hazard}
            className="flex items-center justify-between p-3 rounded-lg bg-[#F7F8F7] dark:bg-white/[0.03] border border-[#E5E8E6] dark:border-white/[0.06] hover:border-[#D6DAD8] dark:hover:border-white/[0.12] transition-all text-xs"
          >
            <div className="flex flex-col min-w-0 pr-3">
              <span className="font-semibold text-[#111513] dark:text-white truncate text-sm">
                {item.hazard}
              </span>
              <span className="text-[11px] text-[#6F7773] dark:text-zinc-500 font-mono truncate mt-0.5">
                Zone: {item.depthZone}
              </span>
            </div>

            <div className={`px-2 py-0.5 rounded-full font-semibold text-[10px] tracking-tight flex items-center gap-1 shrink-0 ${getBadgeClass(item.level)}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span>{item.level}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Meta */}
      <div className="pt-4 mt-4 border-t border-[#E5E8E6] dark:border-white/[0.06] text-[11px] text-[#6F7773] dark:text-zinc-500 font-mono flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[#4B5250] dark:text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Mud density within safe margins
        </span>
        <span className="text-[#858C89] dark:text-zinc-600 font-medium">Auto-calibrated</span>
      </div>
    </div>
  );
}
