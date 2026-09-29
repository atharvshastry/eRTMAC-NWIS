/**
 * Alert API Service
 * 
 * Endpoints:
 *   GET   /alerts
 *   GET   /alerts/:id
 *   GET   /alerts/:id/evidence
 *   GET   /alerts/:id/recommendations
 *   PATCH /alerts/:id/status
 */

import { apiClient, safeApiCall } from './api';
import { MOCK_ALERTS, MOCK_ALERT_TIMELINE } from '../data/mockAlerts';

// Local in-memory alert state
let alertsStore = [...MOCK_ALERTS];
let timelineStore = [...MOCK_ALERT_TIMELINE];

/**
 * Filter computation for fallback state
 */
function filterFallbackAlerts(filters = {}) {
  let filtered = [...alertsStore];

  if (filters.severity && filters.severity !== 'ALL') {
    filtered = filtered.filter((a) => a.severity.toLowerCase() === filters.severity.toLowerCase());
  }

  if (filters.type && filters.type !== 'ALL') {
    filtered = filtered.filter((a) => a.type === filters.type);
  }

  if (filters.wellId && filters.wellId !== 'ALL') {
    filtered = filtered.filter((a) => a.wellId === filters.wellId);
  }

  if (filters.formation && filters.formation !== 'ALL') {
    filtered = filtered.filter((a) => a.formation === filters.formation);
  }

  if (filters.status && filters.status !== 'ALL') {
    filtered = filtered.filter((a) => a.status.toLowerCase() === filters.status.toLowerCase());
  }

  if (filters.minDepth !== undefined && filters.minDepth !== '') {
    filtered = filtered.filter((a) => a.currentDepth >= Number(filters.minDepth));
  }

  if (filters.maxDepth !== undefined && filters.maxDepth !== '') {
    filtered = filtered.filter((a) => a.currentDepth <= Number(filters.maxDepth));
  }

  const counts = {
    total: alertsStore.length,
    active: alertsStore.filter((a) => a.status === 'Active').length,
    critical: alertsStore.filter((a) => a.severity === 'Critical' && a.status !== 'Resolved').length,
    historicalPattern: alertsStore.filter((a) => a.isHistoricalPattern && a.status !== 'Resolved').length,
    acknowledged: alertsStore.filter((a) => a.status === 'Acknowledged').length,
    resolved: alertsStore.filter((a) => a.status === 'Resolved').length,
  };

  return {
    alerts: filtered,
    summary: counts,
  };
}

/**
 * GET /alerts
 */
export async function getAlerts(filters = {}) {
  const query = new URLSearchParams();
  if (filters.severity && filters.severity !== 'ALL') query.set('severity', filters.severity);
  if (filters.type && filters.type !== 'ALL') query.set('type', filters.type);
  if (filters.wellId && filters.wellId !== 'ALL') query.set('wellId', filters.wellId);
  if (filters.status && filters.status !== 'ALL') query.set('status', filters.status);

  const endpoint = `/alerts${query.toString() ? `?${query.toString()}` : ''}`;

  const res = await safeApiCall(
    () => apiClient.get(endpoint),
    () => filterFallbackAlerts(filters),
    'GET /alerts'
  );

  return {
    ...res.data,
    isBackendLive: res.isBackendLive,
  };
}

/**
 * GET /alerts/:id
 */
export async function getAlertById(id) {
  const fallback = alertsStore.find((a) => a.id === id);

  const res = await safeApiCall(
    () => apiClient.get(`/alerts/${id}`),
    fallback,
    `GET /alerts/${id}`
  );

  return res.data;
}

/**
 * GET /alerts/:id/evidence
 */
export async function getAlertEvidence(id) {
  const fallback = alertsStore.find((a) => a.id === id)?.evidence;

  const res = await safeApiCall(
    () => apiClient.get(`/alerts/${id}/evidence`),
    fallback,
    `GET /alerts/${id}/evidence`
  );

  return res.data;
}

/**
 * GET /alerts/:id/recommendations
 */
export async function getAlertRecommendations(id) {
  const fallback = alertsStore.find((a) => a.id === id)?.recommendation;

  const res = await safeApiCall(
    () => apiClient.get(`/alerts/${id}/recommendations`),
    fallback,
    `GET /alerts/${id}/recommendations`
  );

  return res.data;
}

/**
 * PATCH /alerts/:id/status
 */
export async function updateAlertStatus(id, newStatus) {
  const res = await safeApiCall(
    () => apiClient.patch(`/alerts/${id}/status`, { status: newStatus }),
    () => {
      const idx = alertsStore.findIndex((a) => a.id === id);
      if (idx !== -1) {
        alertsStore[idx] = { ...alertsStore[idx], status: newStatus };
        return alertsStore[idx];
      }
      return null;
    },
    `PATCH /alerts/${id}/status`
  );

  return res.data;
}

/**
 * GET /alerts/timeline
 */
export async function getAlertTimeline() {
  const res = await safeApiCall(
    () => apiClient.get('/alerts/timeline'),
    timelineStore,
    'GET /alerts/timeline'
  );

  return res.data;
}
