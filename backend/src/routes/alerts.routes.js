/**
 * Alerts routes, rewritten against alertsStore.js -- the in-memory list of real,
 * evidence-backed alerts produced by the Python risk engine as drillingSimulator.js
 * advances the simulated active well (see both files). The original Postgres-based
 * implementation converted historical events into alerts on every request; this version
 * reflects what has actually "fired" during this run, same as a real monitoring system.
 */
const alertsStore = require("../data/alertsStore");

async function alertsRoutes(app) {
  app.get("/api/alerts", async (request) => {
    const { severity, type, wellId, status } = request.query;
    let alerts = alertsStore.list();
    if (severity && severity !== "ALL") alerts = alerts.filter((a) => a.severity.toLowerCase() === severity.toLowerCase());
    if (type && type !== "ALL") alerts = alerts.filter((a) => a.type === type);
    if (wellId && wellId !== "ALL") alerts = alerts.filter((a) => a.wellId === wellId);
    if (status && status !== "ALL") alerts = alerts.filter((a) => a.status.toLowerCase() === status.toLowerCase());

    return { alerts, summary: alertsStore.summary() };
  });

  app.get("/api/alerts/timeline", async () => alertsStore.timeline());

  app.get("/api/alerts/:id", async (request, reply) => {
    const alert = alertsStore.findById(request.params.id);
    if (!alert) return reply.code(404).send({ success: false, message: `Unknown alert ${request.params.id}` });
    return alert;
  });

  app.get("/api/alerts/:id/evidence", async (request, reply) => {
    const alert = alertsStore.findById(request.params.id);
    if (!alert) return reply.code(404).send({ success: false, message: `Unknown alert ${request.params.id}` });
    return alert.evidence;
  });

  app.get("/api/alerts/:id/recommendations", async (request, reply) => {
    const alert = alertsStore.findById(request.params.id);
    if (!alert) return reply.code(404).send({ success: false, message: `Unknown alert ${request.params.id}` });
    return alert.recommendation;
  });

  app.patch("/api/alerts/:id/status", async (request, reply) => {
    const { status } = request.body || {};
    if (!status) return reply.code(400).send({ success: false, message: "status is required" });
    const updated = alertsStore.updateStatus(request.params.id, status);
    if (!updated) return reply.code(404).send({ success: false, message: `Unknown alert ${request.params.id}` });
    return updated;
  });
}

module.exports = alertsRoutes;
