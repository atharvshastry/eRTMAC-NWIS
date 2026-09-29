import React from 'react';
import { BookOpen, AlertCircle } from 'lucide-react';

export default function LessonsLearned({ lessons = [] }) {
  const fallbackLessons = [
    {
      id: 'LL-01',
      title: 'Loss Circulation in Target Horizon',
      observation:
        'Mud losses were observed while drilling through the Demo Formation around 2,650–2,750 m. Fluid loss rates reached 45 bbl/hr.',
      mitigation:
        'Recommended historical mitigation: Monitor mud volume continuously, maintain appropriate mud rheology, and keep pre-blended LCM on surface.',
    },
    {
      id: 'LL-02',
      title: 'Differential Sticking Avoidance',
      observation:
        'High hydrostatic overbalance resulted in pipe sticking while taking static inclination surveys at 2,900 m.',
      mitigation:
        'Recommended historical mitigation: Minimize connection and survey duration; rotate string during circulation pauses.',
    },
  ];

  const items = lessons && lessons.length > 0 ? lessons : fallbackLessons;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
            Historical Lessons Learned &amp; Observations
          </h3>
        </div>

        {/* Clear Engineering Label Badge */}
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-amber-950/60 border border-amber-800/80 text-amber-400 text-[10px] font-mono font-bold">
          <AlertCircle className="w-3 h-3 text-amber-400" />
          <span>HISTORICAL OBSERVATION</span>
        </div>
      </div>

      {/* Engineering Disclaimer Notice */}
      <div className="p-2 rounded-xs bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400">
        <span className="text-slate-300 font-bold mr-1">NOTICE:</span>
        All observations, mitigation records, and drilling summaries are historical archive records from offset operations. They are provided solely for geological and engineering reference and must not be used as live autonomous drilling commands.
      </div>

      {/* Lessons Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="p-3 rounded-sm bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span className="font-bold text-blue-400">{item.id || `LL-0${idx + 1}`}</span>
                <span>Assam-Arakan Archive</span>
              </div>
              <h4 className="text-xs font-bold text-slate-200 mb-1">
                {item.title}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {item.observation}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-blue-300 leading-relaxed font-sans bg-blue-950/20 p-2 rounded-xs border border-blue-900/40">
              <strong className="font-mono text-blue-400 block text-[10px] uppercase mb-0.5">
                Archived Mitigation:
              </strong>
              {item.mitigation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
