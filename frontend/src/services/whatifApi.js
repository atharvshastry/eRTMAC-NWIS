/**
 * What-If Drilling Simulator REST API Service.
 *
 * Endpoints:
 *   GET /wells/catalog
 *   GET /wells/:id/whatif
 *
 * New feature, no mock dataset to fall back to -- same honest-gap pattern as wellApi.js's
 * personnel/notes calls: offline just returns null/empty rather than fabricating a comparison.
 */
import { apiClient, safeApiCall } from './api';

/** GET /wells/catalog -- every well in the dataset, for the well picker. */
export async function getWellCatalog() {
  const res = await safeApiCall(
    () => apiClient.get('/wells/catalog'),
    () => [],
    'GET /wells/catalog'
  );
  return res.data;
}

/**
 * GET /wells/:id/whatif -- baseline vs. proposed-parameter risk comparison.
 * params: { depth, mudWeight, casingDepth, bitType, lookahead, radius, minBand }
 */
export async function getWhatIf(wellId, params = {}) {
  const query = new URLSearchParams();
  if (params.depth != null && params.depth !== '') query.set('depth', params.depth);
  if (params.mudWeight != null && params.mudWeight !== '') query.set('mudWeight', params.mudWeight);
  if (params.casingDepth != null && params.casingDepth !== '') query.set('casingDepth', params.casingDepth);
  if (params.bitType) query.set('bitType', params.bitType);
  if (params.lookahead) query.set('lookahead', params.lookahead);
  if (params.radius) query.set('radius', params.radius);
  if (params.minBand) query.set('minBand', params.minBand);

  const endpoint = `/wells/${wellId}/whatif${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await safeApiCall(
    () => apiClient.get(endpoint),
    () => null,
    `GET /wells/${wellId}/whatif`
  );
  return { ...res.data, isBackendLive: res.isBackendLive };
}

export default { getWellCatalog, getWhatIf };
