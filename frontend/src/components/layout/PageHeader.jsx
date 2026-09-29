import React from 'react';

export default function PageHeader({
  title,
  subtitle,
  actions,
  badge,
  children,
}) {
  return (
    <div className="mb-6 pb-5 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {title}
          </h2>
          {badge && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-white/[0.06] text-zinc-300 border border-white/[0.1]">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0">
          {actions}
        </div>
      )}

      {children}
    </div>
  );
}
