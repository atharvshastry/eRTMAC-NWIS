/**
 * Drilling Telemetry REST API Service
 * 
 * Endpoints:
 *   GET /drilling/live
 *   GET /drilling/history
 *   GET /drilling/parameters
 */

import { apiClient, safeApiCall } from './api';
import {
  activeWellInfo,
  parameterDefs,
  formationData,
  offsetWells,
  getInitialChartData,
} from '../data/mockLiveDrilling';

/**
 * GET /drilling/live
 */
export async function getLiveDrilling(wellId = 'OIL-DEMO-001') {
  const fallback = {
    well: activeWellInfo,
    formation: formationData,
    parameters: parameterDefs,
    offsets: offsetWells,
    timestamp: new Date().toISOString(),
  };

  const res = await safeApiCall(
    () => apiClient.get(`/wells/${wellId}/drilling/live`),
    fallback,
    'GET /drilling/live'
  );

  return {
    ...res.data,
    isBackendLive: res.isBackendLive,
  };
}

/**
 * GET /drilling/history
 */
export async function getDrillingHistory(hours = 4, wellId = 'OIL-DEMO-001') {
  const fallback = getInitialChartData();

  const res = await safeApiCall(
    () => apiClient.get(`/wells/${wellId}/drilling/history?hours=${hours}`),
    fallback,
    'GET /drilling/history'
  );

  return {
    chartData: res.data,
    isBackendLive: res.isBackendLive,
  };
}

/**
 * GET /drilling/parameters
 */
export async function getDrillingParameters() {
  const res = await safeApiCall(
    () => apiClient.get('/drilling/parameters'),
    parameterDefs,
    'GET /drilling/parameters'
  );

  return {
    parameters: res.data,
    isBackendLive: res.isBackendLive,
  };
}
