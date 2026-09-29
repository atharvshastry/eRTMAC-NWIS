import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorState({
  title = 'Unable to load data',
  message = 'Please check telemetry connectivity and try again.',
  onRetry,
}) {
  return (
    <div className="p-8 bg-[#101012] border border-rose-500/20 rounded-[22px] flex flex-col items-center justify-center text-center space-y-3 max-w-md mx-auto my-6 shadow-2xl">
      <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-secondary mt-2"
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-300" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
