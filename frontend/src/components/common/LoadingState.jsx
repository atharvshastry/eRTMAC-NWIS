import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading telemetry data...' }) {
  return (
    <div className="p-12 bg-[#101012] border border-white/[0.08] rounded-[22px] flex flex-col items-center justify-center text-center space-y-3">
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300">
        <Loader2 className="w-5 h-5 text-zinc-200 animate-spin" />
      </div>
      <span className="text-xs sm:text-sm font-medium text-zinc-400">{message}</span>
    </div>
  );
}
