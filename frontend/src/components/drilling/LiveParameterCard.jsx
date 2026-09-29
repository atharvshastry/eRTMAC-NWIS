import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function LiveParameterCard({ label, value, unit, history = [] }) {
  // Determine trend from last two history values
  let trendDirection = 'steady';
  if (history.length >= 2) {
    const prev = history[history.length - 2];
    const curr = history[history.length - 1];
    if (curr > prev) trendDirection = 'up';
    else if (curr < prev) trendDirection = 'down';
  }

  const renderTrendIcon = () => {
    if (trendDirection === 'up') return <ArrowUp className="w-3 h-3 text-blue-400" />;
    if (trendDirection === 'down') return <ArrowDown className="w-3 h-3 text-slate-400" />;
    return <Minus className="w-3 h-3 text-slate-500" />;
  };

  // Mini sparkline from recent history (last 10 points)
  const sparkData = history.slice(-10);
  const sparkW = 60;
  const sparkH = 18;

  let sparkPath = '';
  if (sparkData.length >= 2) {
    const min = Math.min(...sparkData);
    const max = Math.max(...sparkData);
    const range = max - min || 1;
    sparkPath = sparkData
      .map((v, i) => {
        const x = (i / (sparkData.length - 1)) * sparkW;
        const y = sparkH - ((v - min) / range) * sparkH;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  // Format the displayed value
  const displayValue = typeof value === 'number'
    ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : value;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-2.5 flex flex-col justify-between min-w-0">
      {/* Label */}
      <div className="text-[10px] text-slate-400 font-medium truncate mb-1">{label}</div>

      {/* Value + Unit */}
      <div className="flex items-baseline gap-1 mb-1.5">
        <span className="text-lg font-bold font-mono text-slate-100 tracking-tight leading-none">
          {displayValue}
        </span>
        {unit && (
          <span className="text-[10px] font-mono text-slate-400">{unit}</span>
        )}
      </div>

      {/* Sparkline + Trend */}
      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/80">
        {sparkPath && (
          <svg width={sparkW} height={sparkH} className="shrink-0">
            <path d={sparkPath} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
          </svg>
        )}
        <div className="flex items-center gap-0.5">
          {renderTrendIcon()}
        </div>
      </div>
    </div>
  );
}
