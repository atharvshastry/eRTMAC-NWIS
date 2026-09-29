/**
 * In-memory store for uploaded documents (mirrors the frontend's own in-memory
 * `documentsStore` in services/documentApi.js, server-side). Resets on server restart --
 * fine for a hackathon demo. Keeps the raw file buffer too, so "retry OCR" can genuinely
 * re-run parsing/extraction rather than just replaying the same cached result.
 */
let _docs = []; // newest first

function add(doc) {
  _docs.unshift(doc);
  return doc;
}

function list() {
  // Never send the raw buffer to the client.
  return _docs.map(({ _buffer, ...rest }) => rest);
}

function getFull(id) {
  return _docs.find((d) => d.id === id) || null;
}

function get(id) {
  const d = getFull(id);
  if (!d) return null;
  const { _buffer, ...rest } = d;
  return rest;
}

function update(id, patch) {
  const idx = _docs.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  _docs[idx] = { ..._docs[idx], ...patch };
  return get(id);
}

function remove(id) {
  const before = _docs.length;
  _docs = _docs.filter((d) => d.id !== id);
  return _docs.length < before;
}

function summary() {
  return {
    total: _docs.length,
    processing: _docs.filter((d) => d.status === "Processing").length,
    completed: _docs.filter((d) => d.status === "Completed").length,
    failed: _docs.filter((d) => d.status === "Failed").length,
    uploaded: _docs.filter((d) => d.status === "Uploaded").length,
  };
}

module.exports = { add, list, get, getFull, update, remove, summary };
