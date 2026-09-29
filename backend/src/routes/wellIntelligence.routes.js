/**
 * GET /api/wells/:wellId/intelligence -- the Well Intelligence detail page's data source.
 * New route (the original teammate backend had no equivalent); reuses the same
 * wellAdapter.js builder as wells.routes.js so the two pages never disagree about one well.
 */
const { toRealId, toDemoId, nearestRecords, activeRecord, ACTIVE_DEMO_ID } = require("../data/wellIdMap");
const { buildWellDetail } = require("../data/wellAdapter");

async function wellIntelligenceRoutes(app) {
  app.get("/api/wells/:wellId/intelligence", async (request, reply) => {
    const { wellId } = request.params;
    const active = activeRecord();
    const activeWell = {
      id: active.demoId,
      name: active.well ? active.well.well_name : active.demoId,
      lat: active.well ? active.well.surface_lat : null,
      lon: active.well ? active.well.surface_lon : null,
      formation: null,
      status: "LIVE",
    };

    const realId = wellId === ACTIVE_DEMO_ID ? active.realId : toRealId(wellId);
    const demoId = toDemoId(realId);
    const rec = nearestRecords().find((r) => r.well.well_id === realId);
    const well = buildWellDetail(realId, demoId, rec ? rec.distanceKm : 0);
    if (!well) return reply.code(404).send({ success: false, message: `Unknown well ${wellId}` });

    return { activeWell, well };
  });
}

module.exports = wellIntelligenceRoutes;
