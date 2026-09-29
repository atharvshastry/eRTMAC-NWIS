/**
 * Autonomous After-Action Learning routes (teammate-suggested feature #2, PS 26121): "after a well is
 * completed, automatically compare predicted vs. actual events, capture lessons learned and feed
 * validated outcomes back into the knowledge system." Thin wrapper over the Python AI service's
 * /after-action endpoints (app/backtest.py::after_action_report, app/after_action_store.py) -- see
 * those modules for what "feed back into the knowledge system" actually means here: appending a
 * grounded lessons-learned summary to the searchable corpus, never retraining the risk model.
 */
const { aiGet, aiPost } = require("../config/aiService");
const { toRealId, toDemoId } = require("../data/wellIdMap");

function reshapeReport(report, wellId) {
  return {
    wellId,
    realId: report.well_id,
    wellName: report.well_name,
    field: report.field,
    actualTdM: report.actual_td_m,
    wellStatus: report.well_status,
    settings: report.settings,
    summary: report.summary,
    caught: report.caught,
    missed: report.missed,
    falseAlarms: report.false_alarms,
    lessonsLearned: report.lessons_learned,
    caveat: report.caveat,
  };
}

async function afterActionRoutes(app) {
  // GET /api/wells/:wellId/after-action?lookahead=&radius=&minBand=&step= -- read-only preview
  app.get("/api/wells/:wellId/after-action", async (request, reply) => {
    const { wellId } = request.params;
    const realId = toRealId(wellId);
    const q = request.query;
    try {
      const report = await aiGet(`/after-action/${encodeURIComponent(realId)}`, {
        lookahead_m: q.lookahead || 150,
        radius_km: q.radius || 30,
        min_band: q.minBand || "MEDIUM",
        step_m: q.step || 25,
      });
      return reshapeReport(report, wellId);
    } catch (err) {
      return reply.code(502).send({ success: false, message: "After-action engine unreachable", detail: err.message });
    }
  });

  // POST /api/wells/:wellId/after-action/publish -- generates + appends the lessons-learned summary
  // to the search corpus (see app/after_action_store.py); an explicit action, not a side effect of
  // viewing the preview above, so an engineer reviews the report before it enters the knowledge base.
  app.post("/api/wells/:wellId/after-action/publish", async (request, reply) => {
    const { wellId } = request.params;
    const realId = toRealId(wellId);
    const body = request.body || {};
    try {
      const result = await aiPost(
        `/after-action/${encodeURIComponent(realId)}/publish`,
        {},
        {
          lookahead_m: body.lookahead || 150,
          radius_km: body.radius || 30,
          min_band: body.minBand || "MEDIUM",
          step_m: body.step || 25,
        }
      );
      return {
        published: result.published,
        report: reshapeReport(result.report, wellId),
        corpusRow: result.corpus_row,
      };
    } catch (err) {
      return reply.code(502).send({ success: false, message: "After-action publish failed", detail: err.message });
    }
  });
}

module.exports = afterActionRoutes;
