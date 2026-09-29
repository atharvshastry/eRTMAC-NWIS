/**
 * Risk Intelligence REST API Service
 * 
 * Endpoints:
 *   GET /risks/current
 *   GET /risks/history
 *   GET /risks/evidence
 */

import { apiClient, safeApiCall } from './api';
import { DASHBOARD_WELLS } from '../data/mockWells';

function getSelectedRiskData(wellId) {
  const well = DASHBOARD_WELLS.find((item) => item.wellId === wellId) || DASHBOARD_WELLS[0];
  const risks = well.risks.map((risk, index) => ({
    id: index + 1,
    name: risk.hazard === 'Kick' ? 'Kick Hazard' : risk.hazard,
    level: risk.level,
    confidence: `${Math.max(35, 92 - index * 11)}%`,
    depth: well.currentDepth,
    count: well.alerts.length + index,
    description: risk.notes || `${risk.hazard} risk evaluated against selected well demo telemetry.`,
  }));
  const evidence = well.alerts.map((alert, index) => ({
    id: index + 1,
    risk: alert.title,
    well: well.wellId,
    depth: well.currentDepth,
    event: alert.description,
    similarity: `${Math.max(70, 91 - index * 6)}%`,
    source: 'DEMO HISTORICAL LOG',
  }));
  return {
    activeWell: { id: well.wellId, status: well.status, depth: well.currentDepth, formation: well.formation },
    risks,
    prediction: { formation: well.formation, depth: well.currentDepth, similarWells: [], detectedRisks: risks.map((risk) => risk.name), status: 'DEMO PREDICTION' },
    mitigation: { risk: risks[0]?.name || 'No active risk', observation: 'Historical demo reference for selected well.', mitigation: 'Validate against live telemetry before acting.', link: '#' },
    timelineData: well.drillingHistory.map((point, index) => ({ depth: point.depth, formation: well.formation, riskZone: risks[index % risks.length]?.level === 'HIGH' })),
    trendData: well.drillingHistory.map((point, index) => ({ depth: point.depth, riskLevel: risks[index % risks.length]?.level === 'HIGH' ? 3 : 1 })),
    evidence,
  };
}

/**
 * GET /risks/current
 */
export async function getCurrentRisks(wellId = 'OIL-DEMO-001') {
  const selected = getSelectedRiskData(wellId);
  const fallback = {
    activeWell: selected.activeWell,
    risks: selected.risks,
    prediction: selected.prediction,
    mitigation: selected.mitigation,
  };

  const res = await safeApiCall(
    () => apiClient.get(`/wells/${wellId}/risks`),
    fallback,
    'GET /risks/current'
  );

  return {
    ...res.data,
    isBackendLive: res.isBackendLive,
  };
}

/**
 * GET /risks/history
 */
export async function getRiskHistory(wellId = 'OIL-DEMO-001') {
  const selected = getSelectedRiskData(wellId);
  const fallback = {
    timelineData: selected.timelineData,
    trendData: selected.trendData,
  };

  const res = await safeApiCall(
    () => apiClient.get(`/wells/${wellId}/risks/history`),
    fallback,
    'GET /risks/history'
  );

  return {
    ...res.data,
    isBackendLive: res.isBackendLive,
  };
}

/**
 * GET /risks/evidence
 */
export async function getRiskEvidence(wellId = 'OIL-DEMO-001') {
  const fallback = getSelectedRiskData(wellId).evidence;

  const res = await safeApiCall(
    () => apiClient.get(`/wells/${wellId}/risks/evidence`),
    fallback,
    'GET /risks/evidence'
  );

  return {
    evidence: res.data,
    isBackendLive: res.isBackendLive,
  };
}
