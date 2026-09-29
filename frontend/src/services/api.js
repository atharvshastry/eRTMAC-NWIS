/**
 * NWIS Centralized REST API Client
 * 
 * Handles base URL configuration, headers, timeout aborts,
 * normalized error formatting, and graceful offline fallback.
 */

const API_BASE_URL =
  (import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://localhost:8000/api';

const DEFAULT_TIMEOUT_MS = 6000;

/**
 * Standardized API Error class that avoids technical stack traces
 * and delivers engineer-friendly messages.
 */
export class ApiError extends Error {
  constructor(message, status = null, code = 'API_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Formats HTTP error response codes into user-friendly messages
 */
function normalizeHttpError(status, serverMessage) {
  switch (status) {
    case 401:
      return new ApiError('Authentication required. Please sign in.', 401, 'UNAUTHORIZED');
    case 403:
      return new ApiError('Access restricted. Insufficient telemetry permissions.', 403, 'FORBIDDEN');
    case 404:
      return new ApiError('Requested telemetry or well resource was not found.', 404, 'NOT_FOUND');
    case 422:
      return new ApiError(serverMessage || 'Validation error in request payload.', 422, 'VALIDATION_ERROR');
    case 500:
    case 502:
    case 503:
    case 504:
      return new ApiError('Telemetry server is temporarily unavailable. Please retry.', status, 'SERVER_ERROR');
    default:
      return new ApiError(serverMessage || `Request failed with status code ${status}.`, status, 'HTTP_ERROR');
  }
}

/**
 * Base HTTP request dispatcher
 */
async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    data = null,
    headers = {},
    timeout = DEFAULT_TIMEOUT_MS,
    isFormData = false,
  } = options;

  // Build clean URL
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL.replace(/\/+$/, '')}${cleanEndpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestHeaders = {
    ...headers,
  };

  if (!isFormData && data && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const fetchOptions = {
    method,
    headers: requestHeaders,
    signal: controller.signal,
  };

  if (data) {
    fetchOptions.body = isFormData ? data : JSON.stringify(data);
  }

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorText = '';
      try {
        const errorJson = await response.json();
        errorText = errorJson.detail || errorJson.message || '';
      } catch {
        errorText = await response.text().catch(() => '');
      }
      throw normalizeHttpError(response.status, errorText);
    }

    // Parse JSON if content exists
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new ApiError('Telemetry connection timed out. Please try again.', 408, 'TIMEOUT');
    }

    if (err instanceof ApiError) {
      throw err;
    }

    // Network / offline error
    throw new ApiError('Unable to connect to telemetry service. Operating in offline demo mode.', 0, 'NETWORK_ERROR');
  }
}

/**
 * High-level API client methods
 */
export const apiClient = {
  get(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint, data, options = {}) {
    return request(endpoint, { ...options, method: 'POST', data });
  },

  patch(endpoint, data, options = {}) {
    return request(endpoint, { ...options, method: 'PATCH', data });
  },

  put(endpoint, data, options = {}) {
    return request(endpoint, { ...options, method: 'PUT', data });
  },

  delete(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'DELETE' });
  },

  upload(endpoint, formData, options = {}) {
    return request(endpoint, { ...options, method: 'POST', data: formData, isFormData: true });
  },
};

/**
 * Safe API wrapper that executes an HTTP request and seamlessly returns
 * fallback mock data when the backend service is offline or returns an error.
 *
 * @param {Function} apiCall - Async function making the apiClient request
 * @param {any} fallbackData - Mock data returned if the backend call fails
 * @param {string} endpointTag - Human readable tag for logging
 * @returns {Promise<{ data: any, isBackendLive: boolean, error: string | null }>}
 */
export async function safeApiCall(apiCall, fallbackData, endpointTag = 'API') {
  try {
    const data = await apiCall();
    return {
      data,
      isBackendLive: true,
      error: null,
    };
  } catch (err) {
    // Graceful fallback to demo data
    return {
      data: typeof fallbackData === 'function' ? fallbackData() : fallbackData,
      isBackendLive: false,
      error: err.message || 'Telemetry offline',
    };
  }
}

export default apiClient;
