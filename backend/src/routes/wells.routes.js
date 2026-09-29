/**
 * Well listing/detail routes, rewritten against the shared CSV dataset (src/data/store.js)
 * instead of Postgres/PostGIS -- see the note at the top of store.js for why. Every well
 * object returned here traces back to real dataset rows via wellAdapter.js; only the demo
 * <-> real ID translation (wellIdMap.js) is a hackathon-deadline convenience layer so the
 * already-built frontend UI (hardcoded to OIL-DEMO-* ids) keeps working unmodified.
 */
const { toRealId, toDemoId, nearestRecords, activeRecord, ACTIVE_DEMO_ID } = require("../data/wellIdMap");
const { buildWellDetail } = require("../data/wellAdapter");
const { getStore } = require("../data/store");
const drillingSimulator = require("../services/drillingSimulator");

function buildActiveWellSummary() {
  const { demoId, realId, well } = activeRecord();
  const state = drillingSimulator.getState();
  return {
    id: demoId,
    name: well ? well.well_name : demoId,
    lat: well ? well.surface_lat : null,
    lon: well ? well.surface_lon : null,
    currentDepth: state ? state.depthM : well && well.actual_td_m,
    targetDepth: well ? well.planned_td_m : null,
    formation: state ? state.formation : null,
    field: well ? well.field : null,
    status: "LIVE",
    isActive: true,
    spudDate: well ? well.spud_date : null,
    rigName: well ? well.rig_name : null,
    mudLoss: "No",
    stuckPipe: "No",
    nptHours: 0,
    realId,
  };
}

async function wellsRoutes(app) {
  // GET /api/wells -- bare array (the 8 mapped nearby wells; fallback used elsewhere is NEARBY_WELLS_DATA)
  app.get("/api/wells", async () => {
    return nearestRecords().map((r) => buildWellDetail(r.well.well_id, r.demoId, r.distanceKm));
  });

  // GET /api/wells/catalog -- ALL wells in the dataset (not just the 8 demo-mapped ones), for pickers
  // that need to target any well by its real id -- e.g. the What-If Simulator and After-Action Reports
  // pages, which aren't tied to the fixed OIL-DEMO-* nearby-wells mapping. Registered as a static path
  // so it resolves before the /:wellId param route below.
  app.get("/api/wells/catalog", async () => {
    const store = getStore();
    return store
      .wellList()
      .map((w) => ({
        wellId: w.well_id,
        demoId: toDemoId(w.well_id),
        name: w.well_name,
        field: w.field,
        status: w.data_status,
        wellStatus: w.well_status,
        actualTdM: w.actual_td_m,
      }))
      .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === "ACTIVE" ? -1 : 1));
  });

  // GET /api/wells/nearby -- { activeWell, wells, summary }
  // `wellId` (optional) re-centers the map on any resolvable well -- a demo id, the real
  // active well id, or any other real dataset id (e.g. one of the Mumbai High wells added
  // to enrich the dataset). Omitted, or resolving to the real active well, keeps the
  // original behavior: the live-tracked active well + its fixed 8-nearest-Assam-wells
  // mapping (nearestRecords()). Any other resolved well computes fresh via store.nearby(),
  // so a field far outside Assam's neighborhood (Mumbai High is ~2,000km away) correctly
  // clusters with its own nearby wells instead of ever entering the Assam mapping.
  app.get("/api/wells/nearby", async (request, reply) => {
    const { radius = 30, formation, status, wellId } = request.query;
    const store = getStore();
    const activeRealId = activeRecord().realId;
    const requestedRealId = wellId ? toRealId(wellId) : null;
    const isActiveWellRequest = !requestedRealId || requestedRealId === activeRealId;

    let centerWell;
    let wells;

    if (isActiveWellRequest) {
      centerWell = buildActiveWellSummary();
      wells = nearestRecords()
        .filter((r) => r.distanceKm <= Number(radius))
        .map((r) => buildWellDetail(r.well.well_id, r.demoId, r.distanceKm));
    } else {
      const centerDetail = buildWellDetail(requestedRealId, toDemoId(requestedRealId), 0);
      if (!centerDetail) {
        return reply.code(404).send({ success: false, message: `Unknown well ${wellId}` });
      }
      centerWell = { ...centerDetail, isActive: true };
      wells = store
        .nearby(requestedRealId, Number(radius))
        .map((r) => buildWellDetail(r.well.well_id, toDemoId(r.well.well_id), r.distanceKm));
    }

    if (formation && formation !== "ALL") wells = wells.filter((w) => w.formation === formation);
    if (status && status !== "ALL") wells = wells.filter((w) => w.status === status);

    return {
      activeWell: centerWell,
      wells,
      summary: {
        nearbyWells: wells.length,
        highRiskWells: wells.filter((w) => w.riskLevel === "HIGH").length,
        historicalEvents: wells.reduce((sum, w) => sum + (w.historicalEvents ? w.historicalEvents.length : 0), 0),
        searchRadius: Number(radius),
      },
    };
  });

  // GET /api/wells/:wellId -- single well (demo id, active demo id, or a real dataset id)
  app.get("/api/wells/:wellId", async (request, reply) => {
    const { wellId } = request.params;
    if (wellId === ACTIVE_DEMO_ID || toRealId(wellId) === toRealId(ACTIVE_DEMO_ID)) {
      return buildActiveWellSummary();
    }
    const realId = toRealId(wellId);
    const demoId = toDemoId(realId);
    const rec = nearestRecords().find((r) => r.well.well_id === realId);
    const detail = buildWellDetail(realId, demoId, rec ? rec.distanceKm : null);
    if (!detail) return reply.code(404).send({ success: false, message: `Unknown well ${wellId}` });
    return detail;
  });

  // GET /api/wells/:wellId/trajectory -- real directional survey stations (MD/TVD/inclination/
  // azimuth/northing/easting, from data/trajectory.csv) for the 3D wellbore trajectory view.
  // Works for the active well or any of its mapped offset wells (demo id or real dataset id).
  app.get("/api/wells/:wellId/trajectory", async (request, reply) => {
    const { wellId } = request.params;
    const isActive = wellId === ACTIVE_DEMO_ID || toRealId(wellId) === toRealId(ACTIVE_DEMO_ID);
    const realId = isActive ? activeRecord().realId : toRealId(wellId);
    const demoId = toDemoId(realId);
    const store = getStore();
    const well = store.getWell(realId);
    if (!well) return reply.code(404).send({ success: false, message: `Unknown well ${wellId}` });

    const stations = (store.trajectoryByWell.get(realId) || [])
      .slice()
      .sort((a, b) => a.md_m - b.md_m)
      .map((s) => ({
        md: s.md_m,
        tvd: s.tvd_m,
        inclination: s.inclination_deg,
        azimuth: s.azimuth_deg,
        northing: s.northing_m,
        easting: s.easting_m,
      }));

    const rec = isActive ? null : nearestRecords().find((r) => r.well.well_id === realId);

    return {
      id: demoId,
      realId,
      name: well.well_name,
      field: well.field,
      status: isActive ? "ACTIVE" : well.well_status,
      isActive,
      distanceKm: rec ? rec.distanceKm : 0,
      surfaceLat: well.surface_lat,
      surfaceLon: well.surface_lon,
      stationCount: stations.length,
      stations,
    };
  });
}

module.exports = wellsRoutes;
