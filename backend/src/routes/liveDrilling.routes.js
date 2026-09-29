/**
 * Serves the simulated live eRTMAC feed (see src/services/drillingSimulator.js) in the shape
 * src/services/drillingApi.js expects. Only the ACTIVE well (OIL-DEMO-001) has a live feed --
 * any other well id gets a 404, which safeApiCall on the frontend quietly turns into its own
 * demo fallback (that well simply isn't "live").
 */
const drillingSimulator = require("../services/drillingSimulator");
const { toRealId, ACTIVE_DEMO_ID } = require("../data/wellIdMap");
const { computeOffsetComparison } = require("../data/offsets");

async function liveDrillingRoutes(app) {
  app.get("/api/wells/:wellId/drilling/live", async (request, reply) => {
    const { wellId } = request.params;
    if (toRealId(wellId) !== toRealId(ACTIVE_DEMO_ID)) {
      return reply.code(404).send({ success: false, message: `${wellId} has no live drilling feed (only the active well does).` });
    }
    const state = drillingSimulator.getState();
    if (!state) {
      return reply.code(503).send({ success: false, message: "Drilling simulator has not started yet." });
    }
    const paramValue = (key) => (state.parameters.find((p) => p.key === key) || {}).value ?? null;

    return {
      well: {
        id: ACTIVE_DEMO_ID,
        status: "LIVE",
        formation: state.formation,
        currentDepth: state.depthM,
        field: undefined, // filled by the frontend's own ACTIVE_WELL fallback shape if absent
      },
      formation: {
        name: state.formation,
        topDepth: Math.max(0, Math.round(state.depthM - 250)),
        currentDepth: state.depthM,
        status: state.isExtrapolated ? "PREDICTED" : "ACTIVE",
      },
      parameters: state.parameters,
      offsets: computeOffsetComparison(
        [paramValue("rop"), paramValue("torque"), paramValue("wob"), paramValue("spp")],
        state.depthM
      ),
      timestamp: state.timestamp,
    };
  });

  app.get("/api/wells/:wellId/drilling/history", async (request, reply) => {
    const { wellId } = request.params;
    if (toRealId(wellId) !== toRealId(ACTIVE_DEMO_ID)) {
      return reply.code(404).send({ success: false, message: `${wellId} has no live drilling feed.` });
    }
    // The simulator only keeps current state, not a rolling window server-side -- the frontend's
    // own hook (useLiveSimulation) already maintains its own chart history client-side from
    // repeated /drilling/live polls, so this just seeds one point rather than duplicating that.
    const state = drillingSimulator.getState();
    if (!state) return reply.code(503).send({ success: false, message: "Drilling simulator has not started yet." });
    const chartData = {};
    for (const p of state.parameters) chartData[p.key] = [p.value];
    return chartData;
  });
}

module.exports = liveDrillingRoutes;
