import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import WellOverview from '../components/wells/WellOverview';
import DrillingHistory from '../components/wells/DrillingHistory';
import HistoricalEvents from '../components/wells/HistoricalEvents';
import FormationInfo from '../components/wells/FormationInfo';
import CasingCementing from '../components/wells/CasingCementing';
import LessonsLearned from '../components/wells/LessonsLearned';
import TeamAndNotes from '../components/wells/TeamAndNotes';
import RiskTimeline from '../components/wells/RiskTimeline';
import WellComparison from '../components/wells/WellComparison';
import { getWellIntelligence } from '../services/wellApi';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { ArrowLeft, GitCompare, FileDown } from 'lucide-react';
import WellSelector from '../components/common/WellSelector';
import { useWellContext } from '../context/WellContext';

export default function WellIntelligence() {
  const { selectedWellId, setSelectedWellId } = useWellContext();
  const [searchParams] = useSearchParams();
  const urlWellId = searchParams.get('wellId');

  // A well opened from elsewhere (a map marker's "View Well Intelligence" popup button, a
  // nearby-wells list row) arrives here as a `?wellId=` query param, but the page itself is
  // driven by the shared well-selection context (so the header's own well dropdown and
  // Dashboard's stay in sync with it). Without this, the query param was silently ignored and
  // the page always showed whatever well the context last had - the default, OIL-DEMO-001,
  // unless something else had changed it first. Sync the URL into the context once so every
  // entry point agrees on which well is actually showing.
  useEffect(() => {
    if (urlWellId && urlWellId !== selectedWellId) {
      setSelectedWellId(urlWellId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlWellId]);

  const wellId = urlWellId || selectedWellId || 'OIL-DEMO-001';

  const [loading, setLoading] = useState(true);
  const [activeWell, setActiveWell] = useState(null);
  const [wellData, setWellData] = useState(null);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getWellIntelligence(wellId);
      setActiveWell(result.activeWell);
      setWellData(result.well);
    } catch (err) {
      console.error('Failed to load well intelligence:', err);
      setError('Unable to load well intelligence. Please verify well ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [wellId]);

  const scrollToComparison = () => {
    const el = document.getElementById('well-comparison-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return <LoadingState message={`Loading well intelligence dossier for ${wellId}...`} />;
  }

  if (error || !wellData) {
    return (
      <ErrorState
        title="Unable to load well intelligence"
        message={error || `No dossier found for well ${wellId}.`}
        onRetry={loadData}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Page Header with Navigation and Target Actions */}
      <PageHeader
        title={`Well Intelligence: ${wellData.id}`}
        subtitle={`Status: Historical Well • Distance: ${wellData.distanceKm} km • Total Depth: ${wellData.totalDepth?.toLocaleString()} m • Formation: ${wellData.formation}`}
        badge={wellData.riskLevel ? `${wellData.riskLevel} RISK` : 'HISTORICAL'}
        actions={
          <>
            <WellSelector />
            <Link
              to="/nearby-wells"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Nearby Wells</span>
            </Link>

            <button
              type="button"
              onClick={() => window.open(`/well-report/${wellId}`, '_blank', 'noopener')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold tracking-wide text-slate-200 transition-colors"
              title="Generate a downloadable PDF dossier for this well"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Generate Report</span>
            </button>

            <button
              type="button"
              onClick={scrollToComparison}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold tracking-wide transition-colors"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Compare with Active Well</span>
            </button>
          </>
        }
      />

      {/* 2. Well Overview Cards */}
      <WellOverview well={wellData} />

      {/* 3. Upper-Middle Grid: Risk Timeline (1/2) + Active Well Comparison (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RiskTimeline
          totalDepth={wellData.totalDepth}
          intervals={wellData.riskIntervals}
        />
        <WellComparison
          activeWell={activeWell}
          selectedWell={wellData}
        />
      </div>

      {/* 4. Middle Grid: Drilling History Timeline (1/2) + Formation Info (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DrillingHistory events={wellData.historicalEvents} />
        <FormationInfo formations={wellData.formations} />
      </div>

      {/* 5. Historical Events Table (Filterable) */}
      <HistoricalEvents events={wellData.historicalEvents} />

      {/* 6. Lower Section: Casing & Cementing + Lessons Learned */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CasingCementing casingPrograms={wellData.casingPrograms} />
        <LessonsLearned lessons={wellData.lessonsLearned} />
      </div>

      {/* 7. Team & Well Notes -- who worked this well, key field officers, and free-text notes
          engineers leave for whoever looks at this well next. Fetches its own data (personnel +
          notes) keyed off wellId rather than riding along in getWellIntelligence's response,
          since notes are mutable and need their own add/refresh cycle. */}
      <TeamAndNotes wellId={wellId} />
    </div>
  );
}
