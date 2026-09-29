/**
 * Translation layer between the frontend's fictional demo well IDs (OIL-DEMO-001..009,
 * baked into WellSelector / WellContext / mockWells.js and not worth rewriting under a
 * hackathon deadline) and the real shared dataset's IDs (OIL-SYN-001..018 +
 * OIL-SYN-ACTIVE-01). This lets the already-built UI keep working unmodified while every
 * route handler underneath it serves real, evidence-backed data.
 *
 * OIL-DEMO-001 always maps to the one ACTIVE well. OIL-DEMO-002..009 map to the 8
 * REAL, GEOGRAPHICALLY NEAREST historical wells to the active well, nearest first --
 * computed once from the dataset at startup rather than hardcoded, so "nearby wells"
 * and their distances shown in the UI are genuinely accurate, not arbitrary.
 */
const { getStore } = require("./store");

const ACTIVE_DEMO_ID = "OIL-DEMO-001";
const DEMO_PREFIX = "OIL-DEMO-";

let _demoToReal = null;
let _realToDemo = null;
let _nearestRecords = null; // [{ demoId, well, distanceKm }] for the 8 mapped historical wells, nearest first

function build() {
  if (_demoToReal) return;
  const store = getStore();
  const activeIds = store.activeIds();
  const activeRealId = activeIds[0] || "OIL-SYN-ACTIVE-01";

  _demoToReal = new Map();
  _realToDemo = new Map();
  _demoToReal.set(ACTIVE_DEMO_ID, activeRealId);
  _realToDemo.set(activeRealId, ACTIVE_DEMO_ID);

  const nearest = store.nearby(activeRealId, 1e9); // all wells, sorted nearest-first
  const historicalNearest = nearest.filter((n) => n.well.data_status === "HISTORICAL").slice(0, 8);
  _nearestRecords = historicalNearest.map((n, i) => {
    const demoId = `${DEMO_PREFIX}${String(i + 2).padStart(3, "0")}`; // 002..009
    _demoToReal.set(demoId, n.well.well_id);
    _realToDemo.set(n.well.well_id, demoId);
    return { demoId, well: n.well, distanceKm: n.distanceKm };
  });
}

/** The 8 mapped nearby historical wells (demoId, real well record, distanceKm), nearest first. */
function nearestRecords() {
  build();
  return _nearestRecords;
}

/** The active well's demo ID + real well record + real ID, for convenience. */
function activeRecord() {
  build();
  const store = getStore();
  const realId = _demoToReal.get(ACTIVE_DEMO_ID);
  return { demoId: ACTIVE_DEMO_ID, realId, well: store.getWell(realId) };
}

/** Demo ID (e.g. "OIL-DEMO-003") -> real dataset well_id. Passes through unrecognized/real IDs unchanged. */
function toRealId(id) {
  if (!id) return id;
  build();
  return _demoToReal.get(id) || id;
}

/** Real dataset well_id -> demo ID, when one exists (only the active well + its 8 nearest have one). */
function toDemoId(realId) {
  if (!realId) return realId;
  build();
  return _realToDemo.get(realId) || realId;
}

function demoIds() {
  build();
  return [..._demoToReal.keys()];
}

module.exports = { toRealId, toDemoId, demoIds, nearestRecords, activeRecord, ACTIVE_DEMO_ID };
