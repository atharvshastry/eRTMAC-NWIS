import React from 'react';
import { Layers } from 'lucide-react';
import { STRATIGRAPHY_DATA } from '../../data/mockDepthRisk';

export default function StratigraphyColumn({ currentDepth, hoveredLayerId, onHoverLayer, onSelectLayer }) {
  const activeLayer = STRATIGRAPHY_DATA.find(
    (layer) => currentDepth >= layer.depthStart && currentDepth < layer.depthEnd
  );

  return (
    <div className="bg-white dark:bg-[#101012] border border-[#E5E8E6] dark:border-white/[0.08] hover:border-[#D6DAD8] dark:hover:border-white/[0.14] rounded-[12px] p-5 sm:p-6 h-full shadow-[0_1px_3px_rgba(0,0,0,0.035)] transition-all duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#E5E8E6] dark:border-white/[0.06] mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#F0F2F1] dark:bg-white/[0.06] flex items-center justify-center text-[#3A403D] dark:text-zinc-200 shrink-0">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-[#111513] dark:text-white tracking-tight">
            Lithological Stratigraphy Column
          </h3>
          <p className="text-xs text-[#6F7773] dark:text-zinc-500 font-sans">Regional geological column with pore pressure regimes and hazards</p>
        </div>
      </div>

      <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1 scrollbar-none">
        {STRATIGRAPHY_DATA.map((layer) => {
          const isActiveBit = activeLayer?.id === layer.id;
          const isHovered = hoveredLayerId === layer.id;
          return (
            <div
              key={layer.id}
              onMouseEnter={() => onHoverLayer?.(layer)}
              onMouseLeave={() => onHoverLayer?.(null)}
              onClick={() => onSelectLayer?.(layer)}
              className={`rounded-lg border p-3 cursor-pointer transition-all text-xs ${
                isActiveBit
                  ? 'bg-[#FCEAEA] border-[#F8D7DA] dark:bg-rose-950/30 dark:border-rose-800/40'
                  : isHovered
                    ? 'bg-[#E0F7FA] border-[#A5E9F5] dark:bg-cyan-950/20 dark:border-cyan-800/30'
                    : 'bg-[#F7F8F7] dark:bg-white/[0.03] border-[#E5E8E6] dark:border-white/[0.06] hover:border-[#D6DAD8] dark:hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: layer.color }} />
                  <span className="font-semibold text-[#111513] dark:text-white truncate text-sm">{layer.name}</span>
                  {isActiveBit && (
                    <span className="shrink-0 text-[9px] font-bold tracking-wide text-[#C52222] dark:text-[#F87171] bg-[#FCEAEA] dark:bg-rose-950/50 border border-[#FECDD3] dark:border-rose-800/50 rounded px-1.5 py-0.5">
                      ACTIVE BIT
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-mono font-semibold text-[#0E7490] dark:text-cyan-400">
                    {layer.depthStart.toLocaleString()}m&ndash;{layer.depthEnd.toLocaleString()}m
                  </div>
                  <div className="text-[10px] text-[#858C89] dark:text-zinc-500 font-mono">{layer.pressure}</div>
                </div>
              </div>
              <p className="text-[11px] text-[#555C59] dark:text-zinc-400 mt-1">Lithology: {layer.lithology}</p>
              <div className={`mt-2 rounded px-2.5 py-1.5 text-[10.5px] border ${
                isActiveBit
                  ? 'bg-[#FEECEC] dark:bg-rose-950/40 border-[#FECDD3] dark:border-rose-800/30 text-[#B91C1C] dark:text-rose-300'
                  : 'bg-white dark:bg-white/[0.02] border-[#E5E8E6] dark:border-white/[0.05] text-[#6F7773] dark:text-zinc-400'
              }`}>
                <span className="font-bold text-[#D97706] dark:text-amber-400">Hazards:</span> {layer.hazards}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
