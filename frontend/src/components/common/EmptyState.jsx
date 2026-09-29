import React from 'react';
import { Database } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'There are no active records matching the current parameters.',
  icon: Icon = Database,
  action,
}) {
  return (
    <div className="p-10 bg-[#101012] border border-white/[0.08] rounded-[22px] flex flex-col items-center justify-center text-center space-y-3">
      <div className="icon-squircle">
        <Icon className="w-5 h-5 text-zinc-400" />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
