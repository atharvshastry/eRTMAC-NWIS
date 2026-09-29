import React, { useState } from 'react';
import { Bell, ChevronRight, X } from 'lucide-react';

export default function RecentAlerts({ alerts = [] }) {
  const [selectedAlert, setSelectedAlert] = useState(null);

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FCEAEA] text-[#E84B4B] border border-[#F8D7DA] dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>HIGH</span>
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>MEDIUM</span>
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0F2F1] text-[#555C59] border border-[#E5E8E6] dark:bg-white/[0.08] dark:text-zinc-300 dark:border-white/[0.1]">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
            <span>INFO</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-[#101012] border border-[#E5E8E6] dark:border-white/[0.08] hover:border-[#D6DAD8] dark:hover:border-white/[0.14] rounded-[12px] p-5 sm:p-6 h-full flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.035)] transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E8E6] dark:border-white/[0.06] mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F0F2F1] dark:bg-white/[0.06] flex items-center justify-center text-[#3A403D] dark:text-zinc-200">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-[#111513] dark:text-white tracking-tight">
              Operational Alerts
            </h3>
            <p className="text-xs text-[#6F7773] dark:text-zinc-500 font-sans">Recent telemetry notifications</p>
          </div>
        </div>
        <span className="text-xs text-[#858C89] dark:text-zinc-500 font-mono">
          {alerts.length} Events
        </span>
      </div>

      {/* Alerts List */}
      <div className="space-y-3 flex-1">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="p-3.5 rounded-lg bg-[#F7F8F7] dark:bg-white/[0.03] border border-[#E5E8E6] dark:border-white/[0.06] hover:border-[#D6DAD8] dark:hover:border-white/[0.12] transition-all"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                {getSeverityBadge(alert.severity)}
                <span className="text-xs font-semibold text-[#111513] dark:text-white truncate">
                  {alert.title}
                </span>
              </div>
              <span className="text-[11px] text-[#858C89] dark:text-zinc-500 font-mono shrink-0">
                {alert.time}
              </span>
            </div>

            <p className="text-xs text-[#555C59] dark:text-zinc-400 leading-relaxed mb-3">
              {alert.description}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-[#E5E8E6] dark:border-white/[0.05] text-xs">
              <span className="text-[11px] font-mono text-[#858C89] dark:text-zinc-500">{alert.id}</span>
              <button
                type="button"
                onClick={() => setSelectedAlert(alert)}
                className="inline-flex items-center gap-1 text-[#20B978] hover:text-[#17965F] dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors cursor-pointer text-xs"
              >
                <span>Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Inline Detail Modal / Drawer if user clicks Details */}
      {selectedAlert && (
        <div className="mt-4 p-4 rounded-lg bg-[#F0F2F1] dark:bg-[#141418] border border-[#E5E8E6] dark:border-white/[0.12] text-xs shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E8E6] dark:border-white/[0.06] mb-2.5">
            <span className="font-semibold text-[#111513] dark:text-white flex items-center gap-2">
              <span className="font-mono text-[#858C89] dark:text-zinc-400">[{selectedAlert.id}]</span>
              {selectedAlert.title}
            </span>
            <button
              type="button"
              onClick={() => setSelectedAlert(null)}
              className="text-[#858C89] hover:text-[#111513] dark:text-zinc-400 dark:hover:text-white p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/[0.06]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-[#4B5250] dark:text-zinc-300 leading-relaxed font-sans">
            {selectedAlert.detail}
          </p>
        </div>
      )}
    </div>
  );
}
