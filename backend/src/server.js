require("dotenv").config();

const Fastify = require("fastify");
const cors = require("@fastify/cors");
const multipart = require("@fastify/multipart");
const pool = require("./config/db");
const authenticate = require("./middleware/auth.middleware");
const authorizeRoles = require("./middleware/role.middleware");

const { initializeSocket } = require("./socket");
const { BASE_URL: AI_SERVICE_URL } = require("./config/aiService");
const drillingSimulator = require("./services/drillingSimulator");

const wellsRoutes = require("./routes/wells.routes");
const wellIntelligenceRoutes = require("./routes/wellIntelligence.routes");
const personnelRoutes = require("./routes/personnel.routes");
const historyRoutes = require("./routes/history.routes");
const realtimeRoutes = require("./routes/realtime.routes");
const riskRoutes = require("./routes/risk.routes");
const whatifRoutes = require("./routes/whatif.routes");
const afterActionRoutes = require("./routes/afterAction.routes");
const alertsRoutes = require("./routes/alerts.routes");
const searchRoutes = require("./routes/search.routes");
const liveDrillingRoutes = require("./routes/liveDrilling.routes");
const documentsRoutes = require("./routes/documents.routes");
const authRoutes = require("./routes/auth.routes");

const app = Fastify({
  logger: true,
});

// The frontend (Vite dev server on :5173) calls this API directly from the browser, so it
// needs CORS -- the original backend had none registered, which would otherwise 400 every
// request from a browser origin different from this server's own.
app.register(cors, { origin: true });
// Matches the Python AI service's own 50MB PDF limit (app/main.py's MAX_BYTES) so a large
// upload fails with the same, honest limit at both hops instead of a confusing partial-body error.
app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });

app.get("/", async (request, reply) => {
  return {
    message: "PS26121 NWIS Backend is running",
  };
});

app.get("/health", async (request, reply) => {
  // Postgres is optional in this architecture -- wells/risk/alerts/search/live-drilling all
  // read the shared CSV dataset directly and call the Python AI service (see src/data/store.js
  // and src/config/aiService.js), so a missing DB no longer blocks the API. This still reports
  // DB status for anyone wiring up the original Postgres-backed auth/history routes.
  let database = "not connected";
  try {
    await pool.query("SELECT NOW()");
    database = "connected";
  } catch {
    /* Postgres not required for the primary demo path -- see comment above */
  }

  let aiService = "unreachable";
  try {
    const res = await fetch(`${AI_SERVICE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) aiService = "connected";
  } catch {
    /* Python AI service not running yet */
  }

  return { status: "OK", database, aiService, aiServiceUrl: AI_SERVICE_URL };
});

const startServer = async () => {
  try {
    await app.listen({
      port: 5002,
      host: "127.0.0.1",
    });

    initializeSocket(app.server);
    drillingSimulator.start();

    console.log("Server running on http://localhost:5002");
    console.log(`AI service expected at ${AI_SERVICE_URL} (uvicorn app.main:app --port 8001)`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};
app.register(wellsRoutes);
app.register(wellIntelligenceRoutes);
app.register(personnelRoutes);
app.register(historyRoutes);
app.register(realtimeRoutes);
app.register(riskRoutes);
app.register(whatifRoutes);
app.register(afterActionRoutes);
app.register(alertsRoutes);
app.register(searchRoutes);
app.register(liveDrillingRoutes);
app.register(documentsRoutes);
app.register(authRoutes);

// Protected test route
app.get("/api/protected-test", {
  preHandler: authenticate
}, async (request, reply) => {

  return {
    success: true,
    message: "You accessed a protected API",
    user: request.user
  };

});

app.get("/api/engineer-test", {
  preHandler: [
    authenticate,
    authorizeRoles("ENGINEER", "ADMIN")
  ]
}, async (request, reply) => {

  return {
    success: true,
    message: "You have engineer-level access",
    user: request.user
  };

});



startServer();
