import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import LoadingState from '../components/common/LoadingState';
import { History, PlayCircle, CheckCircle2, XCircle, AlertTriangle, UploadCloud, AlertOctagon, Sparkles } from 'lucide-react';
import { getWellCatalog } from '../services/whatifApi';
import { getAfterActionReport, publishAfterActionReport } from '../services/afterActionApi';

function StatTile({ label, value, accent }) {
  return (
    <div className="p-2.5 rounded-sm bg-slate-950/60 border border-slate-800">
      <span className="text-[10px] text-slate-500 block font-mono">{label}</span>
      <strong className={`text-lg font-mono ${accent || 'text-slate-100'}`}>{value}</strong>
    </div>
  );
}

export default function AfterActionReports() {
  const [wells, setWells] = useState([]);
  const [wellId, setWellId] = useState('');
  const [minBand, setMinBand] = useState('MEDIUM');
  const [report, setReport] = useState(null);
  const [loadingWells, setLoadingWells] = useState(true);
  const [running, setRunning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoadingWells(true);
      const catalog = await getWellCatalog();
      setWells(catalog || []);
      const preferred = (catalog || []).find((w) => w.status === 'HISTORICAL') || (catalog || [])[0];
      if (preferred) setWellId(preferred.wellId);
      setLoadingWells(false);
    })();
  }, []);

  const selectedWell = useMemo(() => wells.find((w) => w.wellId === wellId), [wells, wellId]);

  const generate = async () => {
    if (!wellId) return;
    setRunning(true);
    setError(null);
    setPublishResult(null);
    const res = await getAfterActionReport(wellId, { minBand, lookahead: 150, radius: 30, step: 25 });
    setRunning(false);
    if (!res || res.isBackendLive === false) {
      setError('After-action engine unreachable. Confirm the backend and AI service are running, then retry.');
      return;
    }
    setReport(res);
  };

  const publish = async () => {
    if (!wellId) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await publishAfterActionReport(wellId, { minBand, lookahead: 150, radius: 30, step: 25 });
      setPublishResult(res);
    } catch (err) {
      setError(err.message || 'Publish failed. The report was generated but not saved to the knowledge base.');
    } finally {
      setPublishing(false);
    }
  };

  if (loadingWells) {
    return <LoadingState message="Loading well catalog..." />;
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      <PageHeader
        title="Autonomous After-Action Learning"
        subtitle="After a well is complete, retroactively replay it through the risk engine and compare predicted vs. actual events — a grounded lessons-learned summary, not a live prediction."
        badge="BETA"
      />

      <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wide space-y-1 block">
            Well
            <select
              value={wellId}
              onChange={(e) => { setWellId(e.target.value); setReport(null); setPublishResult(null); }}
              className="w-full bg-slate-950 border border-slate-700 rounded-sm px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {wells.map((w) => (
                <option key={w.wellId} value={w.wellId}>{w.name} ({w.status})</option>
              ))}
            </select>
          </label>

          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wide space-y-1 block">
            Minimum band replayed
            <select
              value={minBand}
              onChange={(e) => setMinBand(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-sm px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="LOW">LOW and above</option>
              <option value="MEDIUM">MEDIUM and above</option>
              <option value="HIGH">HIGH only</option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={generate}
              disabled={running || !wellId}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5" /> {running ? 'Replaying…' : 'Generate Report'}
            </button>
          </div>
        </div>

        {selectedWell?.status === 'ACTIVE' && (
          <div className="flex items-center gap-2 text-xs text-amber-300 font-mono bg-amber-950/40 border border-amber-900/60 rounded-sm px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {selectedWell.name} is still being drilled — its recorded-events count may be incomplete.
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-rose-400 font-mono bg-rose-950/40 border border-rose-900/60 rounded-sm px-3 py-2">
            <AlertOctagon className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
        )}
      </div>

      {report && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-sm p-3.5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-bold text-sm text-slate-100 font-mono">{report.wellName}</span>
                <span className="text-xs font-mono text-slate-500 ml-2">{report.field}</span>
              </div>
              <button
                type="button"
                onClick={publish}
                disabled={publishing || !!publishResult}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold transition-colors"
                title="Append the lessons-learned summary to the searchable knowledge base"
              >
                <UploadCloud className="w-3.5 h-3.5" /> {publishResult ? 'Published' : publishing ? 'Publishing…' : 'Publish to Knowledge Base'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <StatTile label="Real Events" value={report.summary.real_events} />
              <StatTile label="Caught" value={report.summary.caught} accent="text-green-400" />
              <StatTile label="Missed" value={report.summary.missed} accent="text-rose-400" />
              <StatTile label="False Alarms" value={report.summary.false_alarms} accent="text-amber-400" />
              <StatTile label="Recall" value={report.summary.recall != null ? `${Math.round(report.summary.recall * 100)}%` : '—'} accent="text-blue-400" />
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-sm p-3 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-relaxed m-0">{report.lessonsLearned}</p>
            </div>

            {publishResult && (
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-mono bg-emerald-950/40 border border-emerald-900/60 rounded-sm px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Added to the searchable knowledge base as {publishResult.corpusRow?.report_id} — findable via Knowledge Repository search.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/80 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Caught ({report.caught.length})</h3>
              </div>
              <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto">
                {report.caught.length === 0 && <p className="text-[11px] text-slate-500 font-mono p-3">No recorded events had a matching alert ahead of time.</p>}
                {report.caught.map((c) => (
                  <div key={c.event_id} className="p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{c.label}</span>
                      <span className="font-mono text-green-400">+{c.lead_m}m lead</span>
                    </div>
                    <p className="text-slate-400 font-mono text-[10.5px]">
                      Actual {c.actual_depth_m}m · alerted {c.first_alert_depth_m}m · {c.band_at_alert} band
                    </p>
                    <p className="text-slate-500">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/80 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Missed ({report.missed.length})</h3>
              </div>
              <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto">
                {report.missed.length === 0 && <p className="text-[11px] text-slate-500 font-mono p-3">No recorded events were missed.</p>}
                {report.missed.map((m) => (
                  <div key={m.event_id} className="p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{m.event_type}</span>
                      <span className="font-mono text-rose-400">{m.severity}</span>
                    </div>
                    <p className="text-slate-400 font-mono text-[10.5px]">Actual depth {m.actual_depth_m}m</p>
                    <p className="text-slate-500">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {report.falseAlarms.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/80 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">False alarms ({report.falseAlarms.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Hazard</th>
                      <th className="py-2 px-3">Zone</th>
                      <th className="py-2 px-3">Band</th>
                      <th className="py-2 px-3">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {report.falseAlarms.map((f, i) => (
                      <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-200 whitespace-nowrap">{f.label}</td>
                        <td className="py-2 px-3 font-mono text-blue-400 whitespace-nowrap">{Math.round(f.zone_from_m)}–{Math.round(f.zone_to_m)}m</td>
                        <td className="py-2 px-3 font-mono text-amber-400">{f.band}</td>
                        <td className="py-2 px-3 text-slate-400">{f.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-sm p-2.5 space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-bold text-amber-400 uppercase font-mono leading-snug">
              <History className="w-4 h-4 text-amber-400 shrink-0" />
              <span>RETROACTIVE REPLAY — NOT A LIVE PREDICTION</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed m-0">{report.caveat}</p>
          </div>
        </>
      )}
    </div>
  );
}
