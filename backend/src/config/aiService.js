/**
 * Thin HTTP client for the Python AI service (FastAPI, default http://localhost:8001).
 * Everything that needs the calibrated risk model, hybrid search/RAG, or NLP query
 * answering goes through here -- this file owns zero business logic itself, it only
 * shapes URLs/query-strings and surfaces failures as a single AiServiceError so route
 * handlers can respond with a clean 502 instead of an unhandled exception when the
 * Python service isn't running.
 */
const BASE_URL = (process.env.AI_SERVICE_URL || "http://localhost:8001").replace(/\/$/, "");
const TIMEOUT_MS = Number(process.env.AI_SERVICE_TIMEOUT_MS || 8000);

class AiServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "AiServiceError";
    this.status = status || 502;
  }
}

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

async function request(method, pathName, { params, body, timeoutMs } = {}) {
  const url = `${BASE_URL}${pathName}${buildQuery(params)}`;
  const effectiveTimeoutMs = timeoutMs || TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveTimeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      let detail = "";
      try {
        detail = JSON.stringify(await res.json());
      } catch {
        /* body wasn't JSON */
      }
      throw new AiServiceError(`AI service ${method} ${pathName} -> ${res.status} ${detail}`, res.status);
    }
    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new AiServiceError(`AI service ${method} ${pathName} timed out after ${effectiveTimeoutMs}ms`, 504);
    }
    if (err instanceof AiServiceError) throw err;
    throw new AiServiceError(`AI service unreachable at ${BASE_URL}: ${err.message}`, 502);
  } finally {
    clearTimeout(timer);
  }
}

const aiGet = (pathName, params, timeoutMs) => request("GET", pathName, { params, timeoutMs });
const aiPost = (pathName, body, params, timeoutMs) => request("POST", pathName, { params, body, timeoutMs });

/**
 * Forwards a file buffer to a multipart/form-data endpoint (only /parse uses this). PDF
 * parsing + OCR can genuinely take longer than the default JSON-call timeout on a big scanned
 * document, so this gets its own longer budget.
 */
async function aiPostFile(pathName, buffer, filename, params, timeoutMs) {
  const url = `${BASE_URL}${pathName}${buildQuery(params)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 45000);
  try {
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: "application/pdf" }), filename);
    const res = await fetch(url, { method: "POST", body: form, signal: controller.signal });
    if (!res.ok) {
      let detail = "";
      try {
        detail = JSON.stringify(await res.json());
      } catch {
        /* body wasn't JSON */
      }
      throw new AiServiceError(`AI service POST ${pathName} -> ${res.status} ${detail}`, res.status);
    }
    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new AiServiceError(`AI service POST ${pathName} timed out`, 504);
    }
    if (err instanceof AiServiceError) throw err;
    throw new AiServiceError(`AI service unreachable at ${BASE_URL}: ${err.message}`, 502);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { aiGet, aiPost, aiPostFile, AiServiceError, BASE_URL };
