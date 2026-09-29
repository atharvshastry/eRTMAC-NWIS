import React from 'react';
import { CheckCircle2, AlertTriangle, Layers, FileSpreadsheet, FileText, Gauge } from 'lucide-react';

export default function OCRSummary({ quality }) {
  if (!quality) return null;

  const {
    confidence = 94,
    pagesProcessed = 16,
    textBlocks = 186,
    tablesDetected = 12,
    warnings = 2,
  } = quality;

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-sm p-3 space-y-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
        <span className="text-[10px] font-mono font-semibold uppercase text-slate-400 tracking-wider">
          OCR Quality Summary
        </span>
        <span className="text-[9px] font-mono text-slate-500">
          Tesseract/Raster Engine v4.2
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
        {/* OCR Confidence */}
        <div className="p-2 rounded-sm bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase block truncate">Confidence</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`font-bold ${
                confidence >= 90
                  ? 'text-green-400'
                  : confidence >= 70
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              {confidence}%
            </span>
          </div>
        </div>

        {/* Pages Processed */}
        <div className="p-2 rounded-sm bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase block truncate">Pages</span>
          <span className="font-bold text-slate-200 block mt-0.5">{pagesProcessed}</span>
        </div>

        {/* Text Blocks Detected */}
        <div className="p-2 rounded-sm bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase block truncate">Text Blocks</span>
          <span className="font-bold text-blue-400 block mt-0.5">{textBlocks}</span>
        </div>

        {/* Tables Detected */}
        <div className="p-2 rounded-sm bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase block truncate">Tables</span>
          <span className="font-bold text-sky-400 block mt-0.5">{tablesDetected}</span>
        </div>

        {/* Warnings */}
        <div className="p-2 rounded-sm bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
          <span className="text-[10px] text-slate-500 uppercase block truncate">Warnings</span>
          <span
            className={`font-bold block mt-0.5 ${
              warnings > 0 ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            {warnings}
          </span>
        </div>
      </div>
    </div>
  );
}
