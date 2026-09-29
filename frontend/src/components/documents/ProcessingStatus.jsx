import React from 'react';
import { Check, Loader2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { OCR_PIPELINE_STAGES } from '../../data/mockDocuments';

export default function ProcessingStatus({
  currentStage = 1,
  status = 'Uploaded',
  progress = 0,
  compact = false,
}) {
  const isFailed = status === 'Failed';
  const isCompleted = status === 'Completed' || currentStage === 4;
  const isProcessing = status === 'Processing';
  const isUploaded = status === 'Uploaded' || currentStage === 1;

  // Status Badge Styling: Uploaded — blue, Processing — amber, Completed — green, Failed — red
  const getStatusBadge = () => {
    switch (status) {
      case 'Completed':
        return (
          <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase bg-green-950/80 text-green-400 border border-green-800/80">
            Completed
          </span>
        );
      case 'Processing':
        return (
          <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase bg-amber-950/80 text-amber-400 border border-amber-800/80 inline-flex items-center gap-1">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            Processing
          </span>
        );
      case 'Failed':
        return (
          <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase bg-red-950/80 text-red-400 border border-red-800/80">
            Failed
          </span>
        );
      case 'Uploaded':
      default:
        return (
          <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase bg-blue-950/80 text-blue-400 border border-blue-800/80">
            Uploaded
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-2">
      {/* Top Status Header */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">OCR Pipeline:</span>
          {getStatusBadge()}
        </div>
        <span className="text-slate-400 text-[11px]">{progress}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-sm overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isCompleted
              ? 'bg-green-500'
              : isFailed
              ? 'bg-red-500'
              : isProcessing
              ? 'bg-amber-500'
              : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
        />
      </div>

      {/* 4-Step Stepper: Uploaded -> OCR Processing -> Text Extracted -> Ready for Analysis */}
      <div className="grid grid-cols-4 gap-1.5 pt-1">
        {OCR_PIPELINE_STAGES.map((stage) => {
          const isDone = currentStage > stage.id || isCompleted;
          const isCurrent = currentStage === stage.id && !isCompleted && !isFailed;

          let stepStyle = 'bg-slate-800/60 text-slate-500 border-slate-700/60';
          let textStyle = 'text-slate-500';

          if (isDone) {
            stepStyle = 'bg-green-950/60 text-green-400 border-green-800/70';
            textStyle = 'text-green-400';
          } else if (isCurrent) {
            stepStyle = 'bg-amber-950/60 text-amber-300 border-amber-600/80 animate-pulse';
            textStyle = 'text-amber-300 font-semibold';
          }

          return (
            <div
              key={stage.id}
              className={`p-1.5 rounded-sm border text-center flex flex-col items-center justify-center ${stepStyle} transition-colors`}
              title={`${stage.name}: ${stage.description}`}
            >
              <div className="flex items-center justify-center w-3.5 h-3.5 mb-0.5 text-[10px] font-mono font-bold">
                {isDone ? (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : isCurrent ? (
                  <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                ) : (
                  <span>{stage.id}</span>
                )}
              </div>
              <span className={`text-[9px] sm:text-[10px] font-mono leading-tight truncate w-full ${textStyle}`}>
                {stage.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
