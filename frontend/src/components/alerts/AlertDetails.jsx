import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Clock,
  Layers,
  Compass,
  AlertTriangle,
  ShieldCheck,
  CheckCircle,
  FileText,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Database,
  Check,
} from 'lucide-react';
import RecommendationPanel from './RecommendationPanel';

export default function AlertDetails({
  alert,
  onClose,
  onAcknowledge,
  onResolve,
}) {
  const navigate = useNavigate();
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);

  if (!alert) return null;

  const {
    id,
    severity,
    type,
    wellId,
    currentDepth,
    formation,
    detectionTime,
    detectionDate,
    status,
    observation,
    evidence,
    recommendation,
  } = alert;

  const handleNavigateWellIntelligence = () => {
    navigate(`/well-intelligence?wellId=${evidence?.relatedWell || wellId}`);
  };

  const handleNavigateDocuments = () => {
    navigate('/documents');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm flex flex-col overflow-hidden">
      {/* Drawer Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-mono text-xs font-bold text-slate-100">
            {id}
          </span>
          <span
            className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase border ${
              severity === 'Critical'
                ? 'bg-red-950/80 text-red-400 border-red-800'
                : severity === 'High'
                ? 'bg-orange-950/80 text-orange-400 border-orange-800'
                : severity === 'Medium'
                ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                : 'bg-green-950/80 text-green-400 border-green-800'
            }`}
          >
            {severity}
          </span>
          <span className="text-xs font-semibold text-slate-200 truncate">
            {type}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Core Properties Grid */}
        <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
          <div className="p-2 bg-slate-950/60 rounded-sm border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Active Well</span>
            <span className="text-slate-200 font-bold">{wellId}</span>
          </div>

          <div className="p-2 bg-slate-950/60 rounded-sm border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Current Depth</span>
            <span className="text-blue-400 font-bold">{currentDepth} m</span>
          </div>

          <div className="p-2 bg-slate-950/60 rounded-sm border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Formation</span>
            <span className="text-slate-200 truncate block">{formation}</span>
          </div>

          <div className="p-2 bg-slate-950/60 rounded-sm border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Detected At</span>
            <span className="text-slate-300 truncate block">
              {detectionTime} ({detectionDate || 'Today'})
            </span>
          </div>
        </div>

        {/* Current Observation */}
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-sm space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px] uppercase font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Current Real-Time Observation</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-sans pt-1">
            {observation}
          </p>
        </div>

        {/* Historical Evidence Box */}
        {evidence && (
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-sm space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px] uppercase font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Historical Offset Evidence</span>
              </div>
              <span className="px-2 py-0.5 rounded-sm bg-blue-950/80 text-blue-400 border border-blue-800/80 text-[10px] font-mono font-bold">
                {evidence.similarity}% Match
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block">Related Offset Well</span>
                <strong className="text-slate-200">{evidence.relatedWell}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Historical Depth</span>
                <span className="text-slate-200">{evidence.historicalDepth} m</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-slate-500 block">Historical Event</span>
                <span className="text-slate-300 font-sans">{evidence.historicalEvent}</span>
              </div>
              <div className="col-span-2 pt-1 border-t border-slate-900 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Source Document:</span>
                <span className="text-blue-400 text-[11px]">{evidence.sourceDocument}</span>
              </div>
            </div>
          </div>
        )}

        {/* Historical Recommendation Panel */}
        <RecommendationPanel
          recommendation={recommendation}
          wellId={wellId}
        />
      </div>

      {/* Footer Workflow Actions */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {alert.status === 'Active' && onAcknowledge && (
            <button
              type="button"
              onClick={() => onAcknowledge(id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Check className="w-3.5 h-3.5 text-amber-400" />
              <span>Acknowledge</span>
            </button>
          )}

          {alert.status !== 'Resolved' && onResolve && (
            <button
              type="button"
              onClick={() => onResolve(id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              <span>Mark Resolved</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleNavigateWellIntelligence}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
            title="View Well Intelligence for related offset"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Well Intelligence</span>
          </button>

          <button
            type="button"
            onClick={handleNavigateDocuments}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            title="View document repository"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Source Doc</span>
          </button>
        </div>
      </div>
    </div>
  );
}
