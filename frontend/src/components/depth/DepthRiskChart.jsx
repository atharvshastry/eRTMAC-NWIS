import React, { useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { DEPTH_TRAJECTORY, HAZARD_ZONE, CHART_MAX_DEPTH } from '../../data/mockDepthRisk';

const CURVES = [
  { key: 'gasInflux', label: 'Gas Influx / Kick', color: '#10b981' },
  { key: 'highTorque', label: 'High Torque Hazard', color: '#a855f7' },
  { key: 'lostCirculation', label: 'Lost Circulation Risk', color: '#f59e0b' },
  { key: 'stuckPipe', label: 'Stuck Pipe Risk', color: '#ef4444' },
];

const WIDTH = 1000;
const HEIGHT = 400;
const PADDING = { top: 30, right: 35, bottom: 55, left: 65 };
const CHART_W = WIDTH - PADDING.left - PADDING.right;
const CHART_H = HEIGHT - PADDING.top - PADDING.bottom;

const X_TICKS = [200, 350, 500, 650, 800, 950, 1100, 1250, 1400, 1550, 1700, 1850, 2000, 2150, 2300, 2450, 2600, 2750, 2900, 3050, 3200, 3350, 3500];
const Y_TICKS = [0, 25, 50, 75, 100];

const getX = (depth) => PADDING.left + (depth / CHART_MAX_DEPTH) * CHART_W;
const getY = (risk) => HEIGHT - PADDING.bottom - (risk / 100) * CHART_H;

function pathFor(key) {
  return DEPTH_TRAJECTORY.reduce((acc, p, i) => {
    const x = getX(p.depth);
    const y = getY(p[key]);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');
}

function nearestPoint(depth) {
  const step = DEPTH_TRAJECTORY[1].depth - DEPTH_TRAJECTORY[0].depth;
  const idx = Math.min(DEPTH_TRAJECTORY.length - 1, Math.max(0, Math.round(depth / step)));
  return DEPTH_TRAJECTORY[idx];
}

export default function DepthRiskChart({ currentDepth, highlightRange = null, onHoverDepth }) {
  const svgRef = useRef(null);
  const [hoverPoint, setHoverPoint] = useState(null);

  const clampedDepth = Math.min(CHART_MAX_DEPTH, Math.max(0, currentDepth));
  const bitPoint = nearestPoint(clampedDepth);

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const svgX = (e.clientX - rect.left) * scaleX;
    const rawDepth = ((svgX - PADDING.left) / CHART_W) * CHART_MAX_DEPTH;
    if (rawDepth < 0 || rawDepth > CHART_MAX_DEPTH) {
      setHoverPoint(null);
      onHoverDepth?.(null);
      return;
    }
    const point = nearestPoint(rawDepth);
    setHoverPoint(point);
    onHoverDepth?.(point.depth);
  };

  const handleMouseLeave = () => {
    setHoverPoint(null);
    onHoverDepth?.(null);
  };

  const tooltipPoint = hoverPoint;
  const tooltipX = tooltipPoint ? Math.min(getX(tooltipPoint.depth) + 12, WIDTH - PADDING.right - 168) : 0;
  const tooltipY = PADDING.top + 6;

  return (
    <div className="bg-white dark:bg-[#101012] border border-[#E5E8E6] dark:border-white/[0.08] hover:border-[#D6DAD8] dark:hover:border-white/[0.14] rounded-[12px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.035)] transition-all duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-[#E5E8E6] dark:border-white/[0.06] mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F0F2F1] dark:bg-white/[0.06] flex items-center justify-center text-[#3A403D] dark:text-zinc-200 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-[#111513] dark:text-white tracking-tight">
              Continuous Depth-Wise Multi-Risk Trajectory
            </h3>
            <p className="text-xs text-[#6F7773] dark:text-zinc-500 font-sans max-w-xl">
              Depth-dependent probability curves across stratigraphy. Highlighted band marks the {HAZARD_ZONE.start.toLocaleString()}&ndash;{HAZARD_ZONE.end.toLocaleString()} m critical zone.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FCEAEA] text-[#E84B4B] border border-[#F8D7DA] dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            {HAZARD_ZONE.start.toLocaleString()}&ndash;{HAZARD_ZONE.end.toLocaleString()}m Hazard
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E0F7FA] text-[#0E7490] border border-[#A5E9F5] dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-800/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
            Bit @ {Math.round(clampedDepth).toLocaleString()}m
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="hazardZoneGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="hoverBandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.03" />
            </linearGradient>
            <filter id="cyanGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Y grid + labels */}
          {Y_TICKS.map((tick) => {
            const y = getY(tick);
            return (
              <g key={`y-${tick}`}>
                <line
                  x1={PADDING.left}
                  y1={y}
                  x2={WIDTH - PADDING.right}
                  y2={y}
                  stroke="currentColor"
                  className="text-gray-200 dark:text-white/[0.05]"
                  strokeWidth="1"
                />
                <text x={PADDING.left - 10} y={y + 3} textAnchor="end" className="fill-[#858C89] dark:fill-zinc-600 text-[10px] font-mono">
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* X grid + labels */}
          {X_TICKS.map((tick) => {
            const x = getX(tick);
            return (
              <g key={`x-${tick}`}>
                <line
                  x1={x}
                  y1={PADDING.top}
                  x2={x}
                  y2={HEIGHT - PADDING.bottom}
                  stroke="currentColor"
                  className="text-gray-100 dark:text-white/[0.03]"
                  strokeWidth="1"
                />
                <text x={x} y={HEIGHT - PADDING.bottom + 16} textAnchor="middle" className="fill-[#858C89] dark:fill-zinc-600 text-[9px] font-mono">
                  {tick}m
                </text>
              </g>
            );
          })}

          {/* Axis titles */}
          <text x={-HEIGHT / 2 + 10} y={16} transform="rotate(-90)" textAnchor="middle" className="fill-[#858C89] dark:fill-zinc-500 text-[9px] font-mono">
            Predicted Risk Probability
          </text>
          <text x={PADDING.left + CHART_W / 2} y={HEIGHT - 8} textAnchor="middle" className="fill-[#858C89] dark:fill-zinc-500 text-[10px] font-mono">
            Measured Depth (meters MD)
          </text>

          {/* Fixed critical hazard band */}
          <rect
            x={getX(HAZARD_ZONE.start)}
            y={PADDING.top}
            width={getX(HAZARD_ZONE.end) - getX(HAZARD_ZONE.start)}
            height={CHART_H}
            fill="url(#hazardZoneGrad)"
            stroke="#ef4444"
            strokeWidth="1.2"
            strokeDasharray="4 3"
            strokeOpacity="0.6"
          />

          {/* Hover-linked highlight band (from stratigraphy/incident hover) */}
          {highlightRange && (
            <rect
              x={getX(Math.max(0, highlightRange.start))}
              y={PADDING.top}
              width={getX(Math.min(CHART_MAX_DEPTH, highlightRange.end)) - getX(Math.max(0, highlightRange.start))}
              height={CHART_H}
              fill="url(#hoverBandGrad)"
              stroke="#06b6d4"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
          )}

          {/* Risk curves */}
          {CURVES.map((curve) => (
            <path key={curve.key} d={pathFor(curve.key)} fill="none" stroke={curve.color} strokeWidth="2" strokeLinejoin="round" />
          ))}

          {/* Current bit dashed line + beacon */}
          <line
            x1={getX(clampedDepth)}
            y1={PADDING.top}
            x2={getX(clampedDepth)}
            y2={HEIGHT - PADDING.bottom}
            stroke="#0891B2"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            strokeOpacity="0.7"
          />
          <circle cx={getX(clampedDepth)} cy={getY(bitPoint.highTorque)} r="7" fill="#06b6d4" fillOpacity="0.2" />
          <circle
            cx={getX(clampedDepth)}
            cy={getY(bitPoint.highTorque)}
            r="4.5"
            fill="#0891B2"
            filter="url(#cyanGlow)"
            className="stroke-white dark:stroke-[#101012]"
            strokeWidth="1.5"
          />
          <rect
            x={getX(clampedDepth) - 30}
            y={PADDING.top - 22}
            width="60"
            height="18"
            rx="4"
            className="fill-[#111513] dark:fill-[#1E2024]"
            stroke="rgba(0, 0, 0, 0.1)"
            strokeWidth="1"
          />
          <text x={getX(clampedDepth)} y={PADDING.top - 9} textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
            {Math.round(clampedDepth).toLocaleString()}m
          </text>

          {/* Mouse hover crosshair */}
          {hoverPoint && (
            <g>
              <line
                x1={getX(hoverPoint.depth)}
                y1={PADDING.top}
                x2={getX(hoverPoint.depth)}
                y2={HEIGHT - PADDING.bottom}
                stroke="currentColor"
                className="text-zinc-400 dark:text-zinc-600"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {CURVES.map((curve) => (
                <circle
                  key={curve.key}
                  cx={getX(hoverPoint.depth)}
                  cy={getY(hoverPoint[curve.key])}
                  r="3"
                  fill={curve.color}
                  className="stroke-white dark:stroke-[#101012]"
                  strokeWidth="1.2"
                />
              ))}

              {/* Tooltip */}
              <g transform={`translate(${tooltipX}, ${tooltipY})`}>
                <rect width="160" height="92" rx="6" className="fill-[#111513] dark:fill-[#1E2024]" stroke="rgba(0, 0, 0, 0.1)" strokeWidth="1" />
                <text x="10" y="16" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  {hoverPoint.depth.toLocaleString()}m &middot; {hoverPoint.formationName}
                </text>
                {CURVES.map((curve, idx) => (
                  <text key={curve.key} x="10" y={32 + idx * 15} fontSize="9.5" fontFamily="monospace" fill={curve.color}>
                    {curve.label}: {hoverPoint[curve.key]}%
                  </text>
                ))}
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 justify-center text-[10.5px] font-mono text-[#555C59] dark:text-zinc-400 pt-2 mt-1 border-t border-[#E5E8E6] dark:border-white/[0.06]">
        {CURVES.map((curve) => (
          <span key={curve.key} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full inline-block" style={{ backgroundColor: curve.color }} />
            {curve.label}
          </span>
        ))}
      </div>
    </div>
  );
}
