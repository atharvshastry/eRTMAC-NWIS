import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function RiskTimeline({
  totalDepth = 3450,
  intervals = [],
}) {
  const defaultIntervals = [
    { from: 0, to: 2100, level: 'NORMAL', label: 'Stable drilling zone' },
    { from: 2100, to: 2600, level: 'MEDIUM', label: 'Torque surge & pore pressure rise' },
    { from: 2600, to: 3000, level: 'HIGH', label: 'Severe loss circulation (45 bbl/h) & sticking' },
    { from: 3000, to: 3450, level: 'MEDIUM', label: 'Gas kick hazard zone' },
  ];

  const items = intervals && intervals.length > 0 ? intervals : defaultIntervals;

  const getIntervalColor = (level) => {
    switch (level) {
      case 'HIGH':
        return 'bg-red-500';
      case 'MEDIUM':
        return 'bg-amber-500';
      case 'NORMAL':
      case 'LOW':
      default:
        return 'bg-emerald-500';
    }
  };

  const getIntervalText = (level) => {
    switch (level) {
      case 'HIGH':
        return 'text-red-400 bg-red-950/60 border-red-900/80';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-950/60 border-amber-900/80';
      case 'NORMAL':
      case 'LOW':
      default:
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-900/80';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 space-y-3 h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
            Wellbore Depth Risk Stratum
          </h3>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          0 m &rarr; {totalDepth?.toLocaleString()} m
        </span>
      </div>

      {/* Visual Continuous Depth Bar */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-slate-400 font-mono flex justify-between">
          <span>0 m (Surface)</span>
          <span>TD: {totalDepth?.toLocaleString()} m</span>
        </div>

        {/* Multi-segment continuous horizontal progress/depth bar */}
        <div className="w-full h-5 rounded-xs bg-slate-950 flex overflow-hidden border border-slate-800">
          {items.map((interval, idx) => {
            const length = interval.to - interval.from;
            const percentage = (length / totalDepth) * 100;
            return (
              <div
                key={idx}
                style={{ width: `${percentage}%` }}
                className={`${getIntervalColor(
                  interval.level
                )} h-full relative group transition-opacity opacity-85 hover:opacity-100 border-r border-slate-900`}
                title={`${interval.from}m - ${interval.to}m: ${interval.level} (${interval.label})`}
              />
            );
          })}
        </div>

        {/* Legend beneath the bar */}
        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
            <span>Normal Zone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-red-500"></span>
            <span>High Risk Hazard</span>
          </div>
        </div>
      </div>

      {/* Detailed Intervals Breakdown */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800">
        {items.map((interval, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-1.5 rounded-xs bg-slate-950/70 border border-slate-800 text-[11px]"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-200">
                {interval.from} – {interval.to} m
              </span>
              <span className="text-slate-400 font-sans text-xs">
                {interval.label}
              </span>
            </div>
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-xs border uppercase ${getIntervalText(
                interval.level
              )}`}
            >
              {interval.level}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
