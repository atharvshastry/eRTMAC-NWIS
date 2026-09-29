/**
 * AI & Knowledge Repository REST API Service
 * 
 * Endpoints:
 *   GET /knowledge/search
 *   POST /ai/query
 */

import { apiClient, safeApiCall } from './api';
import mockKnowledge from '../data/mockKnowledge';

/**
 * GET /knowledge/search
 */
export async function searchKnowledge(query = '', filters = {}) {
  const queryParams = new URLSearchParams();
  if (query) queryParams.set('q', query);
  if (filters.well) queryParams.set('well', filters.well);
  if (filters.formation) queryParams.set('formation', filters.formation);
  if (filters.eventType) queryParams.set('eventType', filters.eventType);
  if (filters.severity) queryParams.set('severity', filters.severity);

  const fallback = mockKnowledge.filter((item) => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      item.wellId.toLowerCase().includes(q) ||
      item.documentName.toLowerCase().includes(q) ||
      item.formation.toLowerCase().includes(q) ||
      item.event.toLowerCase().includes(q);

    const matchesFilters =
      (!filters.well || item.wellId === filters.well) &&
      (!filters.formation || item.formation === filters.formation) &&
      (!filters.eventType || item.event === filters.eventType) &&
      (!filters.severity || item.severity === filters.severity);

    return matchesQuery && matchesFilters;
  });

  const endpoint = `/knowledge/search${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const res = await safeApiCall(
    () => apiClient.get(endpoint),
    fallback,
    'GET /knowledge/search'
  );

  return {
    results: res.data,
    isBackendLive: res.isBackendLive,
  };
}

/**
 * POST /ai/query
 *
 * wellId (optional) scopes the answer to a specific well -- e.g. when the chatbot is
 * asked a question while the person is on that well's Well Intelligence page. The
 * backend passes it through to the Python search/answer endpoint's well_id filter;
 * omitted, the query searches across all wells.
 */
export async function queryDrillingAssistant(prompt, wellId = null) {
  const fallback = {
    answer: 'Historical offset wells indicate elevated risk of circulation loss in upper Barail formation. Maintain ECD below 1.31 SG and stage LCM.',
    sources: ['DDR-DEMO-003.pdf', 'WCR-DEMO-002.pdf'],
    isFallback: true,
  };

  // Timeout budget, hop by hop: Ollama itself gets up to 30s (app/search.py's answer()) before
  // search.py gives up and degrades to plain search results; the Node backend's own call to that
  // Python service gets 35s (config/aiService.js / search.routes.js's /api/ai/query handler); this
  // client call needs to outlast both, so it gets 40s. The client's default request timeout is only
  // 6s (see services/api.js) -- that was aborting the request and showing the offline fallback well
  // before either backend hop had a chance to return a real synthesized answer.
  const res = await safeApiCall(
    () => apiClient.post('/ai/query', wellId ? { prompt, wellId } : { prompt }, { timeout: 40000 }),
    fallback,
    'POST /ai/query'
  );

  return { ...res.data, isBackendLive: res.isBackendLive };
}
