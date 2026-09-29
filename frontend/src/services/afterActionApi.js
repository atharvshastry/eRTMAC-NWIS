/**
 * Autonomous After-Action Learning REST API Service.
 *
 * Endpoints:
 *   GET  /wells/:id/after-action           -- preview (read-only)
 *   POST /wells/:id/after-action/publish   -- publish lessons-learned into the search corpus
 *
 * New feature, no mock dataset to fall back to -- offline returns null and the page shows a
 * retry state, same honest-gap pattern as wellApi.js's personnel/notes calls.
 */
import { apiClient, safeApiCall } from './api';

export async function getAfterActionReport(wellId, params = {}) {
  const query = new URLSearchParams();
  if (params.lookahead) query.set('lookahead', params.lookahead);
  if (params.radius) query.set('radius', params.radius);
  if (params.minBand) query.set('minBand', params.minBand);
  if (params.step) query.set('step', params.step);

  const endpoint = `/wells/${wellId}/after-action${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await safeApiCall(
    () => apiClient.get(endpoint),
    () => null,
    `GET /wells/${wellId}/after-action`
  );
  return { ...res.data, isBackendLive: res.isBackendLive };
}

/** No offline fallback -- publishing genuinely can't happen without the backend, so this throws
 * rather than pretending to succeed (same pattern as wellApi.js::addWellNote). */
export async function publishAfterActionReport(wellId, params = {}) {
  const res = await apiClient.post(`/wells/${wellId}/after-action/publish`, {
    lookahead: params.lookahead,
    radius: params.radius,
    minBand: params.minBand,
    step: params.step,
  });
  return res;
}

export default { getAfterActionReport, publishAfterActionReport };
