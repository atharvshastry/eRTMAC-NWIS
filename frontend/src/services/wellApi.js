/**
 * Well REST API Service
 * 
 * Endpoints:
 *   GET /wells
 *   GET /wells/:id
 *   GET /wells/nearby
 *   GET /wells/:id/intelligence
 */

import { apiClient, safeApiCall } from './api';
import { ACTIVE_WELL, DASHBOARD_WELLS, NEARBY_WELLS_DATA } from '../data/mockWells';

/**
 * Fallback computation for nearby wells filtering
 */
function getFallbackNearbyWells(params = {}) {
  const {
    radius = 10,
    formation = 'ALL',
    status = 'ALL',
    eventTypes = [],
  } = params;

  let filtered = NEARBY_WELLS_DATA.filter((w) => w.distanceKm <= Number(radius));

  if (formation && formation !== 'ALL') {
    filtered = filtered.filter((w) => w.formation === formation);
  }

  if (status && status !== 'ALL') {
    filtered = filtered.filter((w) => w.status === status);
  }

  if (eventTypes && eventTypes.length > 0) {
    filtered = filtered.filter((w) =>
      w.historicalEvents.some((e) => eventTypes.includes(e.type))
    );
  }

  return {
    activeWell: ACTIVE_WELL,
    wells: filtered,
    summary: {
      nearbyWells: filtered.length,
      highRiskWells: filtered.filter((w) => w.riskLevel === 'HIGH').length,
      historicalEvents: filtered.reduce(
        (sum, w) => sum + (w.historicalEvents ? w.historicalEvents.length : 0),
        0
      ),
      searchRadius: Number(radius),
    },
  };
}

/**
 * Fallback computation for well intelligence
 */
function getFallbackWellIntelligence(wellId = 'OIL-DEMO-003') {
  const dashboardWell = DASHBOARD_WELLS.find((w) => w.wellId === wellId) || DASHBOARD_WELLS[0];
  const targetWell = NEARBY_WELLS_DATA.find((w) => w.id === wellId) || {
    id: dashboardWell.wellId,
    name: `Well ${dashboardWell.wellId}`,
    lat: dashboardWell.latitude,
    lon: dashboardWell.longitude,
    distanceKm: 0,
    totalDepth: dashboardWell.totalDepth,
    formation: dashboardWell.formation,
    status: dashboardWell.status,
    riskLevel: dashboardWell.risks.some((risk) => risk.level === 'HIGH') ? 'HIGH' : 'LOW',
    spudYear: Number(dashboardWell.spudDate.slice(0, 4)),
    field: dashboardWell.field,
    drillingDuration: dashboardWell.status === 'LIVE' ? '39 days' : '46 days',
    historicalEvents: dashboardWell.alerts.map((alert) => ({
      depth: dashboardWell.currentDepth,
      type: alert.title,
      severity: alert.severity,
      description: alert.description,
      mitigation: alert.detail,
      npt: '0 hr',
    })),
  };

  const fallbackEvents = targetWell.historicalEvents?.length
    ? targetWell.historicalEvents
    : dashboardWell.alerts.map((alert) => ({
        depth: dashboardWell.currentDepth,
        type: alert.title,
        severity: alert.severity,
        description: alert.description,
        mitigation: alert.detail,
        npt: '0 hr',
      }));
  const genericFormations = [
    { formation: 'Alluvium / Surface', topDepth: 0, bottomDepth: 650, lithology: 'Unconsolidated Sand & Silt', historicalRisk: 'LOW' },
    { formation: dashboardWell.formation, topDepth: 650, bottomDepth: dashboardWell.totalDepth, lithology: 'Demo Formation Sandstone & Shale', historicalRisk: dashboardWell.risks.some((risk) => risk.level === 'HIGH') ? 'HIGH' : 'LOW' },
  ];

  // Enrich with demo003's detailed fields if missing on targetWell
  const enrichedWell = {
    ...dashboardWell,
    ...targetWell,
    id: dashboardWell.wellId,
    name: `Well ${dashboardWell.wellId}`,
    lat: dashboardWell.latitude,
    lon: dashboardWell.longitude,
    formations: targetWell.formations || genericFormations,
    riskIntervals: targetWell.riskIntervals || dashboardWell.risks.map((risk, index) => ({ from: index * 500, to: Math.min(dashboardWell.totalDepth, (index + 1) * 500), level: risk.level, label: risk.hazard })),
    casingPrograms: targetWell.casingPrograms || [
      { casingSize: '13-3/8 inch', settingDepth: '850 m', cementType: 'Class G + additives', cementVolume: '720 sacks', status: 'Verified' },
      { casingSize: '9-5/8 inch', settingDepth: `${Math.round(dashboardWell.totalDepth * 0.72).toLocaleString()} m`, cementType: 'Lightweight slurry', cementVolume: '980 sacks', status: 'Shoe Tested' },
    ],
    lessonsLearned: targetWell.lessonsLearned || dashboardWell.alerts.map((alert, index) => ({ id: `${wellId}-LL-${index}`, title: alert.title, observation: alert.description, mitigation: alert.detail })),
    historicalEvents: fallbackEvents,
    field: dashboardWell.field,
    drillingDuration: targetWell.drillingDuration || '46 days',
  };

  return {
    activeWell: ACTIVE_WELL,
    well: enrichedWell,
  };
}

/**
 * GET /wells/nearby
 */
export async function getNearbyWells(params = {}) {
  const query = new URLSearchParams();
  if (params.wellId) query.set('wellId', params.wellId);
  if (params.radius) query.set('radius', params.radius);
  if (params.formation && params.formation !== 'ALL') query.set('formation', params.formation);
  if (params.status && params.status !== 'ALL') query.set('status', params.status);

  const endpoint = `/wells/nearby${query.toString() ? `?${query.toString()}` : ''}`;

  const res = await safeApiCall(
    () => apiClient.get(endpoint),
    () => getFallbackNearbyWells(params),
    'GET /wells/nearby'
  );

  return {
    ...res.data,
    isBackendLive: res.isBackendLive,
  };
}

/**
 * GET /wells
 */
export async function getWells() {
  const res = await safeApiCall(
    () => apiClient.get('/wells'),
    () => NEARBY_WELLS_DATA,
    'GET /wells'
  );
  return res.data;
}

/**
 * GET /wells/:id
 */
export async function getWellById(wellId) {
  const res = await safeApiCall(
    () => apiClient.get(`/wells/${wellId}`),
    () => NEARBY_WELLS_DATA.find((w) => w.id === wellId) || ACTIVE_WELL,
    `GET /wells/${wellId}`
  );
  return res.data;
}

/**
 * GET /wells/:id/intelligence
 */
export async function getWellIntelligence(wellId = 'OIL-DEMO-003') {
  const res = await safeApiCall(
    () => apiClient.get(`/wells/${wellId}/intelligence`),
    () => getFallbackWellIntelligence(wellId),
    `GET /wells/${wellId}/intelligence`
  );

  return {
    ...res.data,
    isBackendLive: res.isBackendLive,
  };
}

/**
 * GET /wells/:id/personnel -- { crew: [...], keyOfficers: [...] }
 * No mock-data fallback exists for this (it's new, not part of the original mock dataset) --
 * offline/unreachable-backend just returns empty lists, same honest-gap pattern as anything else
 * this app can't fabricate believable fallback data for.
 */
export async function getWellPersonnel(wellId) {
  const res = await safeApiCall(
    () => apiClient.get(`/wells/${wellId}/personnel`),
    () => ({ wellId, crew: [], keyOfficers: [] }),
    `GET /wells/${wellId}/personnel`
  );
  return { ...res.data, isBackendLive: res.isBackendLive };
}

/**
 * GET /wells/:id/notes -- { notes: [...] }, newest first
 */
export async function getWellNotes(wellId) {
  const res = await safeApiCall(
    () => apiClient.get(`/wells/${wellId}/notes`),
    () => ({ wellId, notes: [] }),
    `GET /wells/${wellId}/notes`
  );
  return { ...res.data, isBackendLive: res.isBackendLive };
}

/**
 * POST /wells/:id/notes -- { author?, text } -> the created note.
 * No offline fallback -- a note genuinely can't be saved without the backend, so this throws
 * rather than pretending to succeed; callers should catch it and tell the user to retry once the
 * backend is reachable, not just clear their draft.
 */
export async function addWellNote(wellId, { author, text }) {
  const res = await apiClient.post(`/wells/${wellId}/notes`, { author, text });
  return res.note;
}

export default {
  getNearbyWells,
  getWells,
  getWellById,
  getWellIntelligence,
  getWellPersonnel,
  getWellNotes,
  addWellNote,
};
