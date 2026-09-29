import React from 'react';
import { Activity } from 'lucide-react';

export default function DrillingTrend({ data = [], wellId = 'OIL-DEMO-001' }) {
  const chartData = data.length > 0 ? data : [{ depth: 0, rop: 0 }];

  // Chart Dimensions & Scales
  const width = 600;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };

  const minDepth = Math.floor(Math.min(...chartData.map((point) => point.depth), 2700) / 100) * 100;
  const maxDepth = Math.max(minDepth + 100, Math.ceil(Math.max(...chartData.map((point) => point.depth), 2860) / 100) * 100);
  const minRop = 0;
  const maxRop = 25;

  const getX = (depth) =>
    padding.left +
    ((depth - minDepth) / (maxDepth - minDepth)) *
      (width - padding.left - padding.right);

  const getY = (rop) =>
    height -
    padding.bottom -
    ((rop - minRop) / (maxRop - minRop)) *
      (height - padding.top - padding.bottom);

  // Path generator for line
  const pathD = chartData.reduce((acc, point, index) => {
    const x = getX(point.depth);
    const y = getY(point.rop);
    return index === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Closed area path for subtle gradient fill
  const areaD = `${pathD} L ${getX(chartData[chartData.length - 1].depth)} ${height - padding.bottom} L ${getX(chartData[0].depth)} ${height - padding.bottom} Z`;

  // Ticks
  const depthTicks = Array.from({ length: 5 }, (_, index) => minDepth + ((maxDepth - minDepth) / 4) * index);
  const ropTicks = [0, 5, 10, 15, 20, 25];

  const currentPoint = chartData[chartData.length - 1];

  return (
    <div className="bg-white dark:bg-[#101012] border border-[#E5E8E6] dark:border-white/[0.08] hover:border-[#D6DAD8] dark:hover:border-white/[0.14] rounded-[12px] p-5 sm:p-6 h-full flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.035)] transition-all duration-200">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#E5E8E6] dark:border-white/[0.06] mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F0F2F1] dark:bg-white/[0.06] flex items-center justify-center text-[#3A403D] dark:text-zinc-200">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-[#111513] dark:text-white tracking-tight">
              Drilling Trend
            </h3>
            <p className="text-xs text-[#6F7773] dark:text-zinc-500 font-sans">
              Depth vs Rate of Penetration (ROP)
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono text-[#555C59] dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-[#111513] dark:bg-white rounded-full inline-block"></span>
            <span className="text-[#111513] dark:text-zinc-300">{wellId}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 border-t border-dashed border-[#858C89] dark:border-zinc-500 inline-block"></span>
            <span className="text-[#858C89] dark:text-zinc-500">Offset Avg (15.0 m/hr)</span>
          </div>
        </div>
      </div>

      {/* SVG Engineering Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-64 select-none"
        >
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines & Y-axis labels (ROP) */}
          {ropTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={`y-${tick}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  className="text-gray-200 dark:text-white/[0.05]"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-[#858C89] dark:fill-zinc-600 text-[10px] font-mono"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Vertical Grid lines & X-axis labels (Depth) */}
          {depthTicks.map((tick) => {
            const x = getX(tick);
            return (
              <g key={`x-${tick}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="currentColor"
                  className="text-gray-200 dark:text-white/[0.05]"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  className="fill-[#858C89] dark:fill-zinc-600 text-[10px] font-mono"
                >
                  {tick}m
                </text>
              </g>
            );
          })}

          {/* Y Axis Title */}
          <text
            x={-height / 2 + 10}
            y={12}
            transform="rotate(-90)"
            textAnchor="middle"
            className="fill-[#858C89] dark:fill-zinc-500 text-[9px] font-mono"
          >
            ROP (m/hr)
          </text>

          {/* Baseline Offset Line (15 m/hr) */}
          <line
            x1={padding.left}
            y1={getY(15)}
            x2={width - padding.right}
            y2={getY(15)}
            stroke="#94A3B8"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            className="dark:stroke-zinc-600"
          />

          {/* Gradient Fill under the curve */}
          <path
            d={areaD}
            fill="url(#curveGradient)"
          />

          {/* Data Path */}
          <path
            d={pathD}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {chartData.map((point, idx) => (
            <circle
              key={idx}
              cx={getX(point.depth)}
              cy={getY(point.rop)}
              r="2.5"
              className="fill-white dark:fill-[#101012] stroke-[#2563EB]"
              strokeWidth="1.5"
            />
          ))}

          {/* Current Depth Highlight Marker */}
          <g>
            <line
              x1={getX(currentPoint.depth)}
              y1={padding.top}
              x2={getX(currentPoint.depth)}
              y2={height - padding.bottom}
              stroke="#2563EB"
              strokeWidth="1"
              strokeDasharray="2 2"
              strokeOpacity="0.4"
            />
            {/* Outer halo */}
            <circle
              cx={getX(currentPoint.depth)}
              cy={getY(currentPoint.rop)}
              r="7"
              fill="#3B82F6"
              fillOpacity="0.2"
            />
            <circle
              cx={getX(currentPoint.depth)}
              cy={getY(currentPoint.rop)}
              r="4"
              fill="#2563EB"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            {/* Tooltip Badge */}
            <rect
              x={getX(currentPoint.depth) - 56}
              y={getY(currentPoint.rop) - 26}
              width="112"
              height="20"
              className="fill-[#111513] dark:fill-[#1E2024]"
              stroke="rgba(0, 0, 0, 0.1)"
              strokeWidth="1"
              rx="4"
            />
            <text
              x={getX(currentPoint.depth)}
              y={getY(currentPoint.rop) - 13}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {currentPoint.depth.toLocaleString()}m: {currentPoint.rop} m/h
            </text>
          </g>
        </svg>
      </div>

      {/* Axis Title Bottom */}
      <div className="text-center text-xs text-[#858C89] dark:text-zinc-500 font-mono pt-2">
        Drill Measured Depth (m)
      </div>
    </div>
  );
}
