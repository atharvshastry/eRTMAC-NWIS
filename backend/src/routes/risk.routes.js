/**
 * Risk Intelligence routes, rewritten to call the Python AI service's calibrated risk engine
 * (/risk/assess -- see app/risk.py) instead of the original backend's uncalibrated raw-SQL
 * scoring. Every risk/evidence item here is the real offset-well assessment; nothing is
 * randomly generated.
 */
const { aiGet } = require("../config/aiService");
const { toRealId, toDemoId, ACTIVE_DEMO_ID, activeRecord } = require("../data/wellIdMap");
const { getStore } = require("../data/store");
const drillingSimulator = require("../services/drillingSimulator");

const BAND_TO_SEVERITY = { HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW" };

/** Sensible "current depth" to assess from when the frontend doesn't pass one explicitly. */
function defaultDepthFor(realId) {
  const active = activeRecord();
  if (realId === active.realId) {
    const state = drillingSimulator.getState();
    if (state) return state.depthM;
  }
  const well = getStore().getWell(realId);
  return well ? well.actual_td_m : 2000;
}

async function assessWell(realId, depthOverride) {
  const depth = depthOverride != null ? Number(depthOverride) : defaultDepthFor(realId);
  const result = await aiGet("/risk/assess", {
    well_id: realId,
    depth_md_m: depth,
    lookahead_m: 200,
    radius_km: 40,
    min_band: "LOW",
  });
  return { depth, result };
}

function toRiskItems(alerts) {
  return alerts.map((a, i) => ({
    id: i + 1,
    name: a.label,
    level: BAND_TO_SEVERITY[a.band] || "LOW",
    confidence: `${Math.round(a.score * 100)}%`,
    depth: Math.round(a.zone_from_m),
    count: a.wells_with_event,
    description: a.message,
  }));
}

function toEvidence(alerts) {
  const rows = [];
  let id = 1;
  for (const a of alerts) {
    for (const e of a.evidence || []) {
      rows.push({
        id: id++,
        risk: a.label,
        well: toDemoId(e.well_id),
        depth: Math.round(e.depth_md_m),
        event: e.description,
        similarity: `${Math.round(a.score * 100)}%`,
        source: `event ${e.event_id} (well ${e.well_id})`,
      });
    }
  }
  return rows;
}

async function riskRoutes(app) {
  app.get("/api/wells/:wellId/risks", async (request, reply) => {
    const { wellId } = request.params;
    const realId = toRealId(wellId);
    try {
      const { depth, result } = await assessWell(realId, request.query.depth);
      const topAlert = result.alerts[0];
      const topEvidence = topAlert && topAlert.evidence && topAlert.evidence[0];
      const similarWells = [...new Set(result.alerts.flatMap((a) => (a.evidence || []).map((e) => toDemoId(e.well_id))))];

      return {
        activeWell: { id: wellId, status: wellId === ACTIVE_DEMO_ID ? "LIVE" : "HISTORICAL", depth, formation: result.formation },
        risks: toRiskItems(result.alerts),
        prediction: {
          formation: result.formation,
          depth,
          similarWells,
          detectedRisks: result.alerts.map((a) => a.label),
          status: `${result.offsets_considered} of ${result.offsets_in_radius} nearby wells drilled this deep`,
        },
        mitigation: topAlert
          ? {
              risk: topAlert.label,
              observation: topAlert.message,
              mitigation:
                (topAlert.recommended_actions && topAlert.recommended_actions[0]) ||
                (topEvidence && topEvidence.mitigation) ||
                "No documented mitigation on file for this risk.",
              link: topEvidence ? `event ${topEvidence.event_id} (well ${topEvidence.well_id})` : "#",
            }
          : { risk: "No active risk", observation: "No offset-well pattern currently matches this depth window.", mitigation: "Continue routine monitoring.", link: "#" },
      };
    } catch (err) {
      return reply.code(502).send({ success: false, message: "Risk engine unreachable", detail: err.message });
    }
  });

  app.get("/api/wells/:wellId/risks/history", async (request, reply) => {
    const { wellId } = request.params;
    const realId = toRealId(wellId);
    const well = getStore().getWell(realId);
    const td = (well && well.actual_td_m) || 3000;
    // Sample the well's own depth range at even intervals and assess risk at each point --
    // a genuine risk-vs-depth timeline, not a random walk.
    const steps = 10;
    const points = Array.from({ length: steps }, (_, i) => Math.round(((i + 1) / steps) * td));
    try {
      const assessments = await Promise.all(
        points.map((depth) =>
          aiGet("/risk/assess", { well_id: realId, depth_md_m: depth, lookahead_m: 200, radius_km: 40, min_band: "LOW" })
        )
      );
      const timelineData = assessments.map((r, i) => ({
        depth: points[i],
        formation: r.formation,
        riskZone: r.alerts.some((a) => a.band === "HIGH"),
      }));
      const trendData = assessments.map((r, i) => ({
        depth: points[i],
        riskLevel: r.alerts.some((a) => a.band === "HIGH") ? 3 : r.alerts.some((a) => a.band === "MEDIUM") ? 2 : 1,
      }));
      return { timelineData, trendData };
    } catch (err) {
      return reply.code(502).send({ success: false, message: "Risk engine unreachable", detail: err.message });
    }
  });

  app.get("/api/wells/:wellId/risks/evidence", async (request, reply) => {
    const { wellId } = request.params;
    const realId = toRealId(wellId);
    try {
      const { result } = await assessWell(realId, request.query.depth);
      return toEvidence(result.alerts);
    } catch (err) {
      return reply.code(502).send({ success: false, message: "Risk engine unreachable", detail: err.message });
    }
  });
}

module.exports = riskRoutes;
