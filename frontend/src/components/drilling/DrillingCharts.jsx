import React from 'react';
import { Activity } from 'lucide-react';

// Four inline SVG charts: Depth vs Time, ROP vs Time, Torque vs Time, SPP vs Time
const CHART_CONFIGS = [
  { key: 'depth',  label: 'Depth vs Time',              unit: 'm',   color: '#3b82f6' },
  { key: 'rop',    label: 'ROP vs Time',                unit: 'm/hr', color: '#22d3ee' },
  { key: 'torque', label: 'Torque vs Time',             unit: 'kNm',  color: '#f59e0b' },
  { key: 'spp',    label: 'Standpipe Pressure vs Time', unit: 'psi',  color: '#ef4444' },
];

function MiniChart({ data = [], label, unit, color }) {
  const width = 280;
  const height = 110;
  const pad = { top: 12, right: 10, bottom: 22, left: 40 };

  if (data.length < 2) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-sm p-3">
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">{label}</div>
        <div className="text-[10px] text-slate-500 italic">Waiting for data…</div>
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const getX = (i) => pad.left + (i / (data.length - 1)) * (width - pad.left - pad.right);
  const getY = (v) => height - pad.bottom - ((v - min) / range) * (height - pad.top - pad.bottom);

  const pathD = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(v).toFixed(1)}`).join(' ');

  // Y-axis ticks (5 ticks)
  const yTicks = [];
  for (let t = 0; t <= 4; t++) {
    const val = min + (range * t) / 4;
    yTicks.push(val);
  }

  // X-axis labels (first, mid, last as relative time)
  const xLabels = [
    { i: 0, label: `-${data.length * 2}s` },
    { i: Math.floor(data.length / 2), label: `-${Math.floor(data.length)}s` },
    { i: data.length - 1, label: 'Now' },
  ];

  const currentVal = data[data.length - 1];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="text-[11px] font-mono font-semibold" style={{ color }}>
          {typeof currentVal === 'number' ? currentVal.toLocaleString('en-US', { maximumFractionDigits: 2 }) : currentVal} {unit}
        </div>
      </div>

      {/* SVG Chart */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
        {/* Grid lines */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
              <text x={pad.left - 4} y={y + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick.toFixed(tick < 100 ? 1 : 0)}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {xLabels.map(({ i, label: xLabel }) => (
          <text key={i} x={getX(i)} y={height - 4} textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">
            {xLabel}
          </text>
        ))}

        {/* Data line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />

        {/* Current point */}
        <circle cx={getX(data.length - 1)} cy={getY(currentVal)} r="3" fill={color} stroke="#090d16" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export default function DrillingCharts({ chartData = {} }) {
  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
        <Activity className="w-4 h-4 text-blue-400" />
        <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
          Real-Time Drilling Charts
        </h3>
        <span className="ml-auto text-[9px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-sm border border-slate-700">
          DEMO LIVE DATA
        </span>
      </div>

      {/* 2×2 Chart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CHART_CONFIGS.map((cfg) => (
          <MiniChart
            key={cfg.key}
            data={chartData[cfg.key] || []}
            label={cfg.label}
            unit={cfg.unit}
            color={cfg.color}
          />
        ))}
      </div>
    </div>
  );
}
