import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/layout/PageHeader';
import AlertCard from '../components/alerts/AlertCard';
import AlertFilters from '../components/alerts/AlertFilters';
import AlertDetails from '../components/alerts/AlertDetails';
import AlertTimeline from '../components/alerts/AlertTimeline';
import {
  getAlerts,
  getAlertTimeline,
  updateAlertStatus,
} from '../services/alertApi';
import {
  Bell,
  AlertTriangle,
  Sparkles,
  CheckCircle,
  RefreshCw,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

const INITIAL_FILTERS = {
  severity: 'ALL',
  type: 'ALL',
  wellId: 'ALL',
  formation: 'ALL',
  status: 'ALL',
  minDepth: '',
  maxDepth: '',
  search: '',
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    critical: 0,
    historicalPattern: 0,
    acknowledged: 0,
    resolved: 0,
  });
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Live drilling generates alerts continuously in the background (drillingSimulator ticks
  // every few seconds), but this page previously only ever fetched once on mount -- a real
  // alert could fire and the page would just sit there showing the old count until someone
  // hit Refresh by hand. That's the opposite of "real-time alerts" from the problem statement,
  // so poll in the background and merge in whatever's new without stealing the user's current
  // selection out from under them.
  useEffect(() => {
    fetchData({ isInitialLoad: true, showSpinner: true });
    const interval = setInterval(() => {
      fetchData({ isInitialLoad: false, showSpinner: false });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async ({ isInitialLoad = false, showSpinner = true } = {}) => {
    try {
      if (showSpinner) setIsLoading(true);
      const [alertsRes, timelineRes] = await Promise.all([
        getAlerts(),
        getAlertTimeline(),
      ]);

      setAlerts(alertsRes.alerts);
      setSummary(alertsRes.summary);
      setTimelineEvents(timelineRes);

      if (isInitialLoad) {
        // Only the very first load auto-picks an alert to show; a background poll or manual
        // refresh must never yank the panel to a different alert while someone's reading it.
        if (alertsRes.alerts.length > 0) {
          const topAlert =
            alertsRes.alerts.find((a) => a.severity === 'Critical') ||
            alertsRes.alerts.find((a) => a.status === 'Active') ||
            alertsRes.alerts[0];
          setSelectedAlert(topAlert);
        }
      } else {
        // Keep whatever alert is selected, just refresh its own data (status, etc.) if it's
        // still present in the new list.
        setSelectedAlert((prev) => {
          if (!prev) return prev;
          const stillThere = alertsRes.alerts.find((a) => a.id === prev.id);
          return stillThere || prev;
        });
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  };

  // Client-side filtering logic
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Severity
      if (filters.severity !== 'ALL' && alert.severity.toLowerCase() !== filters.severity.toLowerCase()) {
        return false;
      }
      // Type
      if (filters.type !== 'ALL' && alert.type !== filters.type) {
        return false;
      }
      // Well
      if (filters.wellId !== 'ALL' && alert.wellId !== filters.wellId) {
        return false;
      }
      // Formation
      if (filters.formation !== 'ALL' && alert.formation !== filters.formation) {
        return false;
      }
      // Status
      if (filters.status !== 'ALL' && alert.status.toLowerCase() !== filters.status.toLowerCase()) {
        return false;
      }
      // Depth
      if (filters.minDepth !== '' && alert.currentDepth < Number(filters.minDepth)) {
        return false;
      }
      if (filters.maxDepth !== '' && alert.currentDepth > Number(filters.maxDepth)) {
        return false;
      }
      // Search
      if (filters.search) {
        const query = filters.search.toLowerCase().trim();
        const matchesQuery =
          alert.id.toLowerCase().includes(query) ||
          alert.type.toLowerCase().includes(query) ||
          alert.shortDescription.toLowerCase().includes(query) ||
          alert.formation.toLowerCase().includes(query) ||
          alert.wellId.toLowerCase().includes(query) ||
          alert.observation.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [alerts, filters]);

  const handleAcknowledgeAlert = async (id) => {
    try {
      const updated = await updateAlertStatus(id, 'Acknowledged');
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      if (selectedAlert?.id === id) {
        setSelectedAlert(updated);
      }
      // Update summary
      setSummary((prev) => ({
        ...prev,
        active: Math.max(0, prev.active - 1),
        acknowledged: prev.acknowledged + 1,
      }));
      showToast(`Alert ${id} acknowledged.`);
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const handleResolveAlert = async (id) => {
    try {
      const updated = await updateAlertStatus(id, 'Resolved');
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      if (selectedAlert?.id === id) {
        setSelectedAlert(updated);
      }
      // Update summary
      setSummary((prev) => ({
        ...prev,
        active: Math.max(0, prev.active - 1),
        resolved: prev.resolved + 1,
      }));
      showToast(`Alert ${id} marked as resolved.`);
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const handleSelectTimelineEvent = (evt) => {
    // Find matching alert if any
    const matching = alerts.find(
      (a) => a.wellId === evt.wellId && evt.event.toLowerCase().includes(a.type.toLowerCase().split(' ')[0])
    );
    if (matching) {
      setSelectedAlert(matching);
    }
  };

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-slate-900 text-slate-100 border border-blue-600 rounded-sm shadow-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Alerts & Recommendations"
        subtitle="Monitor drilling risks, historical patterns, and operational events."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchData({ isInitialLoad: false, showSpinner: true })}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
              title="Refresh alerts"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Active Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Active Alerts
            </span>
            <span className="text-lg font-bold text-blue-400">
              {summary.active}
            </span>
          </div>
          <Bell className="w-4 h-4 text-blue-400" />
        </div>

        {/* Critical Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Critical Alerts
            </span>
            <span className="text-lg font-bold text-red-400">
              {summary.critical}
            </span>
          </div>
          <ShieldAlert className="w-4 h-4 text-red-400" />
        </div>

        {/* Historical Pattern Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Historical Patterns
            </span>
            <span className="text-lg font-bold text-sky-300">
              {summary.historicalPattern}
            </span>
          </div>
          <Sparkles className="w-4 h-4 text-sky-400" />
        </div>

        {/* Acknowledged Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Acknowledged
            </span>
            <span className="text-lg font-bold text-amber-400">
              {summary.acknowledged}
            </span>
          </div>
          <CheckCircle className="w-4 h-4 text-amber-400" />
        </div>
      </div>

      {/* Filters Bar */}
      <AlertFilters
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(INITIAL_FILTERS)}
        totalCount={alerts.length}
        filteredCount={filteredAlerts.length}
      />

      {/* Main Content: Split Alert List & Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Alert List (7 cols on large screens) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-200">
              Alert Queue ({filteredAlerts.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Ordered by severity & detection time
            </span>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-8 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-300">No alerts match current filters</p>
              <button
                type="button"
                onClick={() => setFilters(INITIAL_FILTERS)}
                className="mt-2 text-blue-400 hover:underline"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  isSelected={selectedAlert?.id === alert.id}
                  onSelect={setSelectedAlert}
                  onAcknowledge={handleAcknowledgeAlert}
                  onResolve={handleResolveAlert}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Alert Details + Chronological Timeline (5 cols on large screens) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Selected Alert Details */}
          {selectedAlert ? (
            <AlertDetails
              alert={selectedAlert}
              onClose={() => setSelectedAlert(null)}
              onAcknowledge={handleAcknowledgeAlert}
              onResolve={handleResolveAlert}
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-6 text-center text-slate-500 text-xs font-mono">
              Select an alert from the list to view full observations, offset evidence, and historical recommendations.
            </div>
          )}

          {/* Chronological Alert Timeline */}
          <AlertTimeline
            events={timelineEvents}
            onSelectEvent={handleSelectTimelineEvent}
          />
        </div>
      </div>
    </div>
  );
}
