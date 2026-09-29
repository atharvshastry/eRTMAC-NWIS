/**
 * Real offset-well parameter comparison for the Live Operations "Offset Comparison" panel --
 * for each of the 8 nearby historical wells (see wellIdMap.js), finds that well's own real
 * eRTMAC-format telemetry row nearest to the active well's current depth and averages
 * ROP/Torque/WOB/Pressure across them, plus the single geographically-nearest well's own
 * values. Nothing here is fabricated; it's a real cross-well average over the same dataset
 * the risk engine uses.
 */
const { getStore } = require("./store");
const { nearestRecords } = require("./wellIdMap");

const KLBF_TO_TONNES = 0.4536;
const KPA_TO_PSI = 0.145038;

function round(v, d) {
  if (v == null || Number.isNaN(v)) return null;
  const m = 10 ** d;
  return Math.round(v * m) / m;
}

function avg(nums) {
  const v = nums.filter((n) => n != null);
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function nearestRowAtDepth(rows, depthM) {
  if (!rows.length) return null;
  let best = rows[0];
  let bestDist = Math.abs(rows[0].md_m - depthM);
  for (const r of rows) {
    const d = Math.abs(r.md_m - depthM);
    if (d < bestDist) {
      best = r;
      bestDist = d;
    }
  }
  return best;
}

/** currentWell: [rop, torque, wob(tons), spp(psi)] for the active well at its current depth. */
function computeOffsetComparison(currentWell, depthM) {
  const store = getStore();
  const records = nearestRecords();
  const rows = records
    .map((r) => nearestRowAtDepth(store.realtimeFor(r.well.well_id), depthM))
    .filter(Boolean);

  const averageOffset = [
    round(avg(rows.map((r) => r.rop_m_hr)), 1),
    round(avg(rows.map((r) => r.torque_kNm)), 1),
    round(avg(rows.map((r) => r.wob_klbf * KLBF_TO_TONNES)), 1),
    round(avg(rows.map((r) => r.spp_kPa * KPA_TO_PSI)), 0),
  ];

  const nearest = rows[0]; // records/rows are already nearest-distance-first
  const nearestSimilar = nearest
    ? [
        round(nearest.rop_m_hr, 1),
        round(nearest.torque_kNm, 1),
        round(nearest.wob_klbf * KLBF_TO_TONNES, 1),
        round(nearest.spp_kPa * KPA_TO_PSI, 0),
      ]
    : averageOffset;

  return {
    parameters: ["ROP", "Torque", "WOB", "Pressure"],
    units: ["m/hr", "kNm", "tons", "psi"],
    currentWell,
    averageOffset,
    nearestSimilar,
  };
}

module.exports = { computeOffsetComparison };
