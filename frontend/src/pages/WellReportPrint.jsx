import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getWellIntelligence } from '../services/wellApi';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { Printer, ArrowLeft } from 'lucide-react';

function fmt(value, suffix = '') {
  if (value === null || value === undefined || value === '') return '—';
  return `${value}${suffix}`;
}

function RiskBadge({ level }) {
  const styles = {
    HIGH: { bg: '#fee2e2', fg: '#991b1b', border: '#fca5a5' },
    MEDIUM: { bg: '#fef3c7', fg: '#92400e', border: '#fcd34d' },
    LOW: { bg: '#dcfce7', fg: '#166534', border: '#86efac' },
    NORMAL: { bg: '#dcfce7', fg: '#166534', border: '#86efac' },
  };
  const s = styles[level] || styles.LOW;
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        padding: '2px 9px',
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {level || 'N/A'}
    </span>
  );
}

export default function WellReportPrint() {
  const { wellId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wellData, setWellData] = useState(null);
  const [isBackendLive, setIsBackendLive] = useState(false);
  const printedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getWellIntelligence(wellId)
      .then((result) => {
        if (cancelled) return;
        setWellData(result.well);
        setIsBackendLive(!!result.isBackendLive);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load well intelligence for report:', err);
        setError('Unable to load well intelligence for this report. Please verify the well ID and try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [wellId]);

  useEffect(() => {
    if (wellData && !printedRef.current) {
      printedRef.current = true;
      // Give the layout a beat to paint before invoking the print dialog. If the browser
      // blocks the automatic call (many do for popups), the visible "Print / Save as PDF"
      // button below is the fallback -- this is never the only way to print the report.
      const t = setTimeout(() => {
        try {
          window.print();
        } catch {
          // ignore -- manual button remains available
        }
      }, 450);
      return () => clearTimeout(t);
    }
  }, [wellData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <LoadingState message={`Building intelligence report for ${wellId}...`} />
        </div>
      </div>
    );
  }

  if (error || !wellData) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-8">
        <ErrorState title="Unable to generate report" message={error || `No dossier found for well ${wellId}.`} />
      </div>
    );
  }

  const generatedAt = new Date();

  return (
    <div style={{ background: '#e8e9eb', minHeight: '100vh' }}>
      <style>{`
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .report-page { box-shadow: none !important; margin: 0 !important; max-width: none !important; }
          @page { margin: 14mm 12mm; }
        }
        .report-page { font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; }
        .report-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .report-table th { text-align: left; background: #0f172a; color: #e2e8f0; padding: 7px 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; font-size: 9.5px; }
        .report-table td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; color: #1e293b; vertical-align: top; }
        .report-table tr:nth-child(even) td { background: #f8fafc; }
        .report-section-title { font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 10px; }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-[#0f172a] border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <Link to={`/well-intelligence?wellId=${wellData.id}`} className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Well Intelligence</span>
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold tracking-wide"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Save as PDF</span>
        </button>
      </div>

      <div className="report-page" style={{ maxWidth: 900, margin: '24px auto', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', padding: '36px 40px' }}>
        {/* Letterhead */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0f172a', paddingBottom: 14, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>eRTMAC-NWIS &middot; Oil India Limited</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>Well Intelligence Report</div>
            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 2 }}>{wellData.name || wellData.id} ({wellData.id})</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 10.5, color: '#64748b' }}>
            <div>Generated {generatedAt.toLocaleString()}</div>
            <div>{isBackendLive ? 'Live telemetry data' : 'Offline demo dataset'}</div>
          </div>
        </div>

        {/* Executive summary */}
        <div style={{ marginBottom: 22 }}>
          <div className="report-section-title">Executive Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: 11 }}>
            {[
              ['Field', fmt(wellData.field)],
              ['Rig', fmt(wellData.rigName)],
              ['Spud Year', fmt(wellData.spudYear)],
              ['Status', fmt(wellData.status)],
              ['Total Depth', fmt(wellData.totalDepth, ' m')],
              ['Target Depth', fmt(wellData.targetDepth, ' m')],
              ['Distance from Active Well', fmt(wellData.distanceKm, ' km')],
              ['Drilling Duration', fmt(wellData.drillingDuration)],
              ['Current Formation', fmt(wellData.formation)],
              ['NPT (Non-Productive Time)', fmt(wellData.nptHours, ' hrs')],
              ['Mud Loss Recorded', fmt(wellData.mudLoss)],
              ['Stuck Pipe Recorded', fmt(wellData.stuckPipe)],
            ].map(([label, value]) => (
              <div key={label} style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10.5, color: '#64748b' }}>Overall Risk Level:</span>
            <RiskBadge level={wellData.riskLevel} />
          </div>
        </div>

        {/* Formation log */}
        {Array.isArray(wellData.formations) && wellData.formations.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div className="report-section-title">Formation Log</div>
            <table className="report-table">
              <thead>
                <tr><th>Formation</th><th>Top (m)</th><th>Base (m)</th><th>Lithology</th><th>Historical Risk</th></tr>
              </thead>
              <tbody>
                {wellData.formations.map((f, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{fmt(f.formation)}</td>
                    <td>{fmt(f.topDepth)}</td>
                    <td>{fmt(f.bottomDepth)}</td>
                    <td>{fmt(f.lithology)}</td>
                    <td><RiskBadge level={f.historicalRisk} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Casing & cementing */}
        {Array.isArray(wellData.casingPrograms) && wellData.casingPrograms.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div className="report-section-title">Casing &amp; Cementing Program</div>
            <table className="report-table">
              <thead>
                <tr><th>Casing Size</th><th>Setting Depth</th><th>Cement Grade</th><th>Slurry Volume</th><th>Result</th></tr>
              </thead>
              <tbody>
                {wellData.casingPrograms.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{fmt(c.casingSize)}</td>
                    <td>{fmt(c.settingDepth)}</td>
                    <td>{fmt(c.cementType)}</td>
                    <td>{fmt(c.cementVolume)}</td>
                    <td>{fmt(c.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Risk zones */}
        {Array.isArray(wellData.riskIntervals) && wellData.riskIntervals.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div className="report-section-title">Risk Zones by Depth</div>
            <table className="report-table">
              <thead>
                <tr><th>From (m)</th><th>To (m)</th><th>Zone</th><th>Level</th></tr>
              </thead>
              <tbody>
                {wellData.riskIntervals.map((r, i) => (
                  <tr key={i}>
                    <td>{fmt(r.from)}</td>
                    <td>{fmt(r.to)}</td>
                    <td>{fmt(r.label)}</td>
                    <td><RiskBadge level={r.level} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Historical events */}
        {Array.isArray(wellData.historicalEvents) && wellData.historicalEvents.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div className="report-section-title">Historical Events</div>
            <table className="report-table">
              <thead>
                <tr><th>Depth (m)</th><th>Type</th><th>Severity</th><th>Description</th><th>Mitigation</th><th>NPT</th></tr>
              </thead>
              <tbody>
                {wellData.historicalEvents.map((e, i) => (
                  <tr key={i}>
                    <td>{fmt(e.depth)}</td>
                    <td style={{ fontWeight: 600 }}>{fmt(e.type)}</td>
                    <td><RiskBadge level={e.severity} /></td>
                    <td style={{ maxWidth: 220 }}>{fmt(e.description)}</td>
                    <td style={{ maxWidth: 200 }}>{fmt(e.mitigation)}</td>
                    <td>{fmt(e.npt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Lessons learned / recommendations */}
        {Array.isArray(wellData.lessonsLearned) && wellData.lessonsLearned.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div className="report-section-title">Lessons Learned &amp; Recommendations</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {wellData.lessonsLearned.map((l) => (
                <div key={l.id} style={{ border: '1px solid #e2e8f0', borderLeft: '4px solid #0f172a', borderRadius: 4, padding: '9px 12px' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>{l.title}</div>
                  <div style={{ fontSize: 10.5, color: '#334155', marginBottom: 3 }}><strong>Observation:</strong> {l.observation}</div>
                  <div style={{ fontSize: 10.5, color: '#334155' }}><strong>Recommended Mitigation:</strong> {l.mitigation}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 28, paddingTop: 12, borderTop: '1px solid #e2e8f0', fontSize: 9, color: '#94a3b8', lineHeight: 1.5 }}>
          Generated by eRTMAC-NWIS &mdash; Enhanced Real-Time Monitoring &amp; Advisory for Well Intelligence, from offset-well drilling records and formation data{isBackendLive ? '.' : ' (offline demo dataset; connect the live backend for production data).'} This report reflects historical offset-well patterns and does not replace on-site engineering judgment.
        </div>
      </div>
    </div>
  );
}
