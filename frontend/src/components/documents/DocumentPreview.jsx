import React, { useState } from 'react';
import {
  FileText,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Layers,
  FileCheck,
  Eye,
  Loader2,
  AlertCircle,
  FileSearch,
  X,
} from 'lucide-react';
import ProcessingStatus from './ProcessingStatus';
import OCRSummary from './OCRSummary';

export default function DocumentPreview({
  document,
  onViewExtractedText,
  onRetryOcr,
  isProcessing = false,
}) {
  const [docModalOpen, setDocModalOpen] = useState(false);

  if (!document) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-sm p-6 text-center text-slate-400 text-xs h-full flex flex-col items-center justify-center">
        <FileText className="w-8 h-8 text-slate-600 mb-2" />
        <p className="font-medium text-slate-300">No document selected</p>
        <p className="text-[11px] text-slate-500 mt-1">
          Select any document from the queue to inspect metadata, OCR quality, and extracted text.
        </p>
      </div>
    );
  }

  const {
    id,
    name,
    type,
    size,
    pageCount = 1,
    uploadDate,
    status,
    ocrStatus = status,
    pipelineStage = 1,
    progress = 0,
    ocrQuality,
    wellId = 'OIL-DEMO-003',
    formation = 'Demo Formation',
  } = document;

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col justify-between space-y-4">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-sm bg-blue-950/80 border border-blue-800/80 flex items-center justify-center text-blue-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-slate-100 truncate" title={name}>
                  {name}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                  <span>{type}</span>
                  <span>·</span>
                  <span>{size}</span>
                  <span>·</span>
                  <span>{pageCount} {pageCount === 1 ? 'Page' : 'Pages'}</span>
                </div>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase shrink-0 border ${
                status === 'Completed'
                  ? 'bg-green-950/80 text-green-400 border-green-800/80'
                  : status === 'Processing'
                  ? 'bg-amber-950/80 text-amber-400 border-amber-800/80'
                  : status === 'Failed'
                  ? 'bg-red-950/80 text-red-400 border-red-800/80'
                  : 'bg-blue-950/80 text-blue-400 border-blue-800/80'
              }`}
            >
              {status}
            </span>
          </div>

          {/* OCR Processing Pipeline Stepper */}
          <div className="py-3 border-b border-slate-800">
            <ProcessingStatus
              currentStage={pipelineStage}
              status={status}
              progress={progress}
              compact={false}
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 pt-3 text-xs font-mono">
            <div className="p-2 bg-slate-950/60 rounded-sm border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Document Name</span>
              <span className="text-slate-200 font-medium truncate block" title={name}>
                {name}
              </span>
            </div>

            <div className="p-2 bg-slate-950/60 rounded-sm border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Document Type</span>
              <span className="text-slate-200 font-medium block">{type}</span>
            </div>

            <div className="p-2 bg-slate-950/60 rounded-sm border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">File Size</span>
              <span className="text-slate-200 font-medium block">{size}</span>
            </div>

            <div className="p-2 bg-slate-950/60 rounded-sm border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Page Count</span>
              <span className="text-slate-200 font-medium block">{pageCount} Pages</span>
            </div>

            <div className="p-2 bg-slate-950/60 rounded-sm border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Upload Date</span>
              <span className="text-slate-300 text-[11px] truncate block">{uploadDate}</span>
            </div>

            <div className="p-2 bg-slate-950/60 rounded-sm border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">OCR Status</span>
              <span
                className={`font-semibold text-[11px] ${
                  ocrStatus === 'Completed'
                    ? 'text-green-400'
                    : ocrStatus === 'Processing'
                    ? 'text-amber-400'
                    : ocrStatus === 'Failed'
                    ? 'text-red-400'
                    : 'text-blue-400'
                }`}
              >
                {ocrStatus}
              </span>
            </div>
          </div>

          {/* OCR Quality Summary */}
          {ocrQuality && (
            <div className="pt-3">
              <OCRSummary quality={ocrQuality} />
            </div>
          )}
        </div>

        {/* Action Buttons: View Document, View Extracted Text, Retry OCR */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* View Document */}
            <button
              type="button"
              onClick={() => setDocModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-sm border border-slate-700 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>View Document</span>
            </button>

            {/* View Extracted Text */}
            <button
              type="button"
              onClick={onViewExtractedText}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-sm transition-colors"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>View Extracted Text</span>
            </button>

            {/* Retry OCR */}
            <button
              type="button"
              onClick={() => onRetryOcr && onRetryOcr(id)}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium rounded-sm border border-slate-700 transition-colors disabled:opacity-40"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Retry OCR</span>
            </button>
          </div>
        </div>
      </div>

      {/* View Document Modal */}
      {docModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-sm w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-slate-100">{name}</span>
                <span className="text-[10px] font-mono text-slate-500">
                  ({type} · {size} · {pageCount} pages)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDocModalOpen(false)}
                className="p-1 rounded-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Document Sheet / Viewer */}
            <div className="p-6 overflow-y-auto bg-slate-950/90 text-xs font-mono text-slate-300 space-y-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-sm">
                <div className="text-center pb-3 border-b border-slate-800 mb-3">
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    OIL INDIA LIMITED — DRILLING OPERATIONS DIVISION
                  </div>
                  <div className="text-sm font-bold text-slate-100 mt-1">
                    {name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Well Reference: {wellId} · Formation: {formation}
                  </div>
                </div>

                <div className="space-y-2 text-[11px] leading-relaxed text-slate-300">
                  <p>
                    <strong>DOCUMENT HEADER:</strong> Certified operational drilling log scanned from rig operations archive.
                  </p>
                  <p>
                    <strong>OCR STATUS:</strong> {ocrStatus} (Confidence: {ocrQuality?.confidence || 94}%)
                  </p>
                  <p className="text-slate-400 text-[10px] italic pt-2 border-t border-slate-800">
                    * This is a simulated document view for prototype inspection. Real raster/PDF rendering can be coupled via PDF.js in the production build.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setDocModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-sm border border-slate-700"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
