import React from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  Minus,
  Gauge,
  Activity,
  RotateCw,
  Droplets,
  Layers,
  Scale
} from 'lucide-react';

// Outline icons matching technical drilling telemetry
function MetricIcon({ label, className = "w-3.5 h-3.5" }) {
  const norm = label.toLowerCase();
  
  if (norm.includes('depth')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12" />
        <path d="m8 11 4 4 4-4" />
        <path d="M4 19h16" />
        <path d="M7 21h10" />
      </svg>
    );
  }
  if (norm.includes('rop')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="m14 10-3 4" />
        <circle cx="12" cy="12" r="1.5" />
      </svg>
    );
  }
  if (norm.includes('torque')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="7" />
        <path d="M12 3v2" />
        <path d="M12 11v2" />
        <path d="M5 8h2" />
        <path d="M17 8h2" />
        <path d="M12 6a2 2 0 1 0 2 2" />
      </svg>
    );
  }
  if (norm.includes('wob')) {
    return <Scale className={className} />;
  }
  if (norm.includes('rpm')) {
    return <RotateCw className={className} />;
  }
  if (norm.includes('mud flow')) {
    return <Droplets className={className} />;
  }
  if (norm.includes('standpipe') || norm.includes('pressure')) {
    return <Gauge className={className} />;
  }
  if (norm.includes('mud weight')) {
    return <Droplets className={className} />;
  }
  if (norm.includes('ecd')) {
    return <Layers className={className} />;
  }
  return <Activity className={className} />;
}

// Sparkline configuration for telemetry wave forms
const SPARKLINES = {
  rop: {
    points: [16.2, 16.5, 16.8, 17.4, 17.1, 17.6, 17.2, 17.8, 17.4, 17.9, 17.1],
    color: '#2563EB',
    fillColor: '#3B82F6',
  },
  torque: {
    points: [11.2, 11.0, 10.6, 10.4, 10.7, 11.1, 10.8, 11.3, 10.9, 10.7, 10.9],
    color: '#EF4444',
    fillColor: '#EF4444',
  },
  wob: {
    points: [13.8, 14.0, 14.5, 14.2, 13.9, 14.4, 14.1, 14.3, 14.0, 14.2, 14.2],
    color: '#10B981',
    fillColor: '#10B981',
  },
  rpm: {
    points: [112, 114, 115, 116, 114, 115, 116, 115, 114, 116, 115],
    color: '#0284C7',
    fillColor: '#0EA5E9',
  },
  'mud flow': {
    points: [1820, 1840, 1855, 1845, 1860, 1850, 1855, 1848, 1852, 1850, 1850],
    color: '#0891B2',
    fillColor: '#06B6D4',
  },
  'standpipe pressure': {
    points: [2910, 2925, 2945, 2930, 2950, 2940, 2935, 2945, 2938, 2940, 2940],
    color: '#7C3AED',
    fillColor: '#8B5CF6',
  },
  'mud weight': {
    points: [1.27, 1.28, 1.28, 1.28, 1.29, 1.28, 1.28, 1.28, 1.28, 1.28, 1.28],
    color: '#059669',
    fillColor: '#10B981',
  },
  ecd: {
    points: [1.29, 1.30, 1.31, 1.30, 1.32, 1.31, 1.31, 1.32, 1.30, 1.31, 1.31],
    color: '#D97706',
    fillColor: '#F59E0B',
  },
};

function MiniSparkline({ label, isPositive = true }) {
  const norm = label.toLowerCase();
  const config = SPARKLINES[norm] || {
    points: [10, 12, 11, 14, 13, 15, 14, 16, 15, 17, 16],
    color: isPositive ? '#2563EB' : '#EF4444',
    fillColor: isPositive ? '#3B82F6' : '#EF4444',
  };

  const points = config.points;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min === 0 ? 1 : max - min;
  
  const width = 220;
  const height = 26;
  const paddingY = 3;

  const getX = (idx) => (idx / (points.length - 1)) * width;
  const getY = (val) => height - paddingY - ((val - min) / range) * (height - paddingY * 2);

  let pathD = `M ${getX(0)} ${getY(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const x0 = getX(i);
    const y0 = getY(points[i]);
    const x1 = getX(i + 1);
    const y1 = getY(points[i + 1]);
    const cx = (x0 + x1) / 2;
    pathD += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  const gradId = `spark-grad-${norm.replace(/[^a-z0-9]/g, '-')}`;

  return (
    <div className="w-full h-7 mt-0.5 overflow-hidden relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={config.fillColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={config.fillColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path
          d={pathD}
          fill="none"
          stroke={config.color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function KPICard({
  label,
  value,
  unit,
  trend,
  trendDirection = 'steady', // 'up' | 'down' | 'steady'
  trendLabel,
  targetDepth = '2,980 m',
}) {
  const isDepth = label.toLowerCase().includes('depth');
  const isUp = trendDirection === 'up';
  const isDown = trendDirection === 'down';

  // Crisp High-Contrast Pill Badges
  let pillClasses = 'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700/60';
  let arrowColor = 'text-zinc-600 dark:text-zinc-300';
  
  if (isUp) {
    pillClasses = 'bg-[#E7F7F0] text-[#0D7A4D] border border-[#A7F3D0] dark:bg-emerald-950/60 dark:text-[#34D399] dark:border-emerald-800/50';
    arrowColor = 'text-[#0D7A4D] dark:text-[#34D399]';
  } else if (isDown) {
    pillClasses = 'bg-[#FCEAEA] text-[#C52222] border border-[#FECDD3] dark:bg-rose-950/60 dark:text-[#F87171] dark:border-rose-800/50';
    arrowColor = 'text-[#C52222] dark:text-[#F87171]';
  }

  return (
    <div className="relative overflow-hidden bg-white dark:bg-[#111215] border border-[#E5E8E6] dark:border-white/[0.09] rounded-[8px] p-2.5 sm:p-3 shadow-[0_1px_2px_rgba(0,0,0,0.035)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:border-[#D6DAD8] dark:hover:border-white/[0.16] transition-all flex flex-col justify-between group">
      
      {/* Subtle Technical Doodle Background Grid Watermark (3% opacity) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.025] overflow-hidden">
        <svg className="w-full h-full text-zinc-950 dark:text-white" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-pattern-kpi" width="14" height="14" patternUnits="userSpaceOnUse">
              <path d="M 14 0 L 0 0 0 14" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern-kpi)" />
        </svg>
      </div>

      {/* Top Row: Icon + Title on left, Status Pill + Comparison on right */}
      <div className="flex items-start justify-between gap-1.5 relative z-10">
        {/* Left: Icon & Label */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-zinc-800 dark:text-zinc-200 shrink-0">
            <MetricIcon label={label} className="w-3.5 h-3.5" />
          </div>
          <span className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">
            {label}
          </span>
        </div>

        {/* Right: Trend Pill & comparison label */}
        <div className="flex flex-col items-end shrink-0">
          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight ${pillClasses}`}>
            {isUp && <ArrowUp className={`w-2.5 h-2.5 ${arrowColor}`} strokeWidth={2.4} />}
            {isDown && <ArrowDown className={`w-2.5 h-2.5 ${arrowColor}`} strokeWidth={2.4} />}
            {!isUp && !isDown && <Minus className="w-2 h-2 opacity-70" strokeWidth={2.4} />}
            <span>{trend || 'Stable'}</span>
          </div>
          {trendLabel && (
            <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
              {trendLabel}
            </span>
          )}
        </div>
      </div>

      {/* Middle: Big Metric Value & Unit - Compact Scale */}
      <div className="flex items-baseline gap-1 my-1 relative z-10">
        <span className="text-[22px] sm:text-[24px] font-extrabold tracking-tight text-zinc-950 dark:text-white font-sans leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 font-sans">
            {unit}
          </span>
        )}
      </div>

      {/* Bottom Visualization: Progress Bar for Current Depth, or Thin Wave Sparkline */}
      <div className="relative z-10 mt-auto pt-0.5">
        {isDepth ? (
          <div>
            {/* Horizontal progress bar */}
            <div className="w-full bg-[#E5E8E6] dark:bg-white/[0.1] h-[4px] rounded-full overflow-hidden mb-1.5">
              <div 
                className="bg-gradient-to-r from-[#0F766E] via-[#0D9488] to-[#10B981] h-full rounded-full transition-all duration-500" 
                style={{ width: '92%' }}
              />
            </div>
            {/* Supporting text & target label */}
            <div className="flex items-center justify-between text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
              <span>TD reached Complete</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                Target: {targetDepth}
              </span>
            </div>
          </div>
        ) : (
          <MiniSparkline label={label} isPositive={!isDown} />
        )}
      </div>

    </div>
  );
}
