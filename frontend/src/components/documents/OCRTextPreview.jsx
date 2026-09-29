import React, { useState } from 'react';
import { FileText, Copy, Check, Sparkles, AlertOctagon } from 'lucide-react';

export default function OCRTextPreview({
  text = '',
  documentName = 'Selected Document',
  ocrStatus = 'Completed',
  // Whether this text came from the offline in-browser fallback (no backend / AI service
  // reachable) rather than the real PDF parse + regex extraction pipeline. Defaults to true
  // (the safer assumption) until the caller actually knows -- never label unverified text as
  // real.
  isDemoOutput = true,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden space-y-0">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <h4 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
            OCR Extracted Text
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {/* This badge used to be unconditional, so genuinely AI-extracted text from a real
              uploaded PDF (documentProcessor.js's real PyMuPDF/pdfplumber parse + regex
              extraction) was mislabeled "Fictional prototype text" right alongside actual demo
              fallback output -- exactly backwards for a page whose whole point is demonstrating
              real OCR/NLP extraction. Show the true state instead. */}
          {isDemoOutput ? (
            <span className="px-2 py-0.5 rounded-sm bg-amber-950/80 text-amber-400 border border-amber-800/80 text-[10px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              DEMO OCR OUTPUT
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-sm bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-[10px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              AI-EXTRACTED (LIVE)
            </span>
          )}

          <button
            type="button"
            onClick={handleCopy}
            disabled={!text}
            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium rounded-sm border border-slate-700 transition-colors disabled:opacity-40"
            title="Copy text to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-400" />
                <span className="text-green-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Disclaimer note: honest about which case we're in, instead of always claiming fictional. */}
      <div className="px-3.5 py-1.5 bg-slate-950/90 border-b border-slate-800/80 text-[10px] font-mono text-slate-500">
        Source document: <span className="text-slate-300">{documentName}</span> ·{' '}
        {isDemoOutput
          ? 'Offline fallback text (AI service unreachable) -- fictional prototype content, not extracted from the actual file.'
          : 'Extracted from the uploaded PDF via the AI service\'s real parser -- still unvalidated telemetry, verify before acting on it.'}
      </div>

      {/* Extracted Text Viewer */}
      <div className="p-3 bg-slate-950/80">
        <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text p-3 bg-slate-900/60 border border-slate-800/70 rounded-sm max-h-[360px] overflow-y-auto">
          {text || 'No text layer available. Execute OCR or check file status.'}
        </pre>
      </div>
    </div>
  );
}
