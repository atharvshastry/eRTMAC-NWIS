/**
 * What-If Drilling Simulator routes (teammate-suggested feature #1, PS 26121): "let engineers test
 * alternative drilling strategies virtually and compare the expected risk ... before execution."
 * Thin wrapper over the Python AI service's /risk/whatif (app/whatif.py) -- see that module's
 * docstring for what this actually computes (offset-well evidence reweighted by which nearby wells
 * recorded similar conditions, NOT a physics simulation) and its calibration caveat.
 */
const { aiGet } = require("../config/aiService");
const { toRealId, toDemoId, activeRecord } = require("../data/wellIdMap");
const { getStore } = require("../data/store");
const drillingSimulator = require("../services/drillingSimulator");

const BAND_TO_SEVERITY = { HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW" };

function defaultDepthFor(realId) {
  const active = activeRecord();
  if (realId === active.realId) {
    const state = drillingSimulator.getState();
    if (state) return state.depthM;
  }
  const well = getStore().getWell(realId);
  return well ? well.actual_td_m : 2000;
}

function toRiskItems(alerts) {
  return (alerts || []).map((a, i) => ({
    id: i + 1,
    name: a.label,
    level: BAND_TO_SEVERITY[a.band] || "LOW",
    confidence: `${Math.round(a.score * 100)}%`,
    depth: Math.round(a.zone_from_m),
    count: a.wells_with_event,
    description: a.message,
  }));
}

async function whatifRoutes(app) {
  // GET /api/wells/:wellId/whatif?depth=&mudWeight=&casingDepth=&bitType=&lookahead=&radius=&minBand=
  app.get("/api/wells/:wellId/whatif", async (request, reply) => {
    const { wellId } = request.params;
    const realId = toRealId(wellId);
    const q = request.query;
    const depth = q.depth != null ? Number(q.depth) : defaultDepthFor(realId);

    try {
      const result = await aiGet("/risk/whatif", {
        well_id: realId,
        depth_md_m: depth,
        mud_weight_sg: q.mudWeight,
        casing_setting_depth_m: q.casingDepth,
        bit_type: q.bitType,
        lookahead_m: q.lookahead || 200,
        radius_km: q.radius || 40,
        min_band: q.minBand || "LOW",
      });

      return {
        wellId,
        realId,
        depth,
        proposedParams: result.proposed_params,
        paramsSpecified: result.params_specified,
        baseline: { risks: toRiskItems(result.baseline.alerts), offsetsConsidered: result.baseline.offsets_considered },
        whatif: { risks: toRiskItems(result.whatif.alerts), offsetsConsidered: result.whatif.offsets_considered },
        matchedWells: (result.matched_wells || []).map((w) => ({
          wellId: toDemoId(w.well_id),
          realId: w.well_id,
          wellName: w.well_name,
          recordedMudWeightSg: w.recorded_mud_weight_sg,
          recordedCasingDepthM: w.recorded_casing_depth_m,
          recordedBitTypes: w.recorded_bit_types,
        })),
        unmatchedWells: (result.unmatched_wells || []).map((w) => ({
          wellId: toDemoId(w.well_id),
          realId: w.well_id,
          wellName: w.well_name,
        })),
        note: result.note,
        caveat: result.caveat,
      };
    } catch (err) {
      return reply.code(502).send({ success: false, message: "What-If simulator unreachable", detail: err.message });
    }
  });
}

module.exports = whatifRoutes;
