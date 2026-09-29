/**
 * Builds the rich, nested well object the frontend expects (see mockWells.js's
 * NEARBY_WELLS_DATA / DASHBOARD_WELLS shape) directly out of the real shared CSV
 * dataset via store.js -- every field here traces back to an actual CSV row, nothing
 * is invented. Used by both wells.routes.js (the nearby-wells list) and
 * wellIntelligence.routes.js (the single-well detail page) so the two stay consistent.
 */
const { getStore } = require("./store");
const { eventTypeToTitle, riskToFrontend, npt } = require("./eventLabels");

const SEVERITY_RANK = { CRITICAL: 3, HIGH: 3, MEDIUM: 2, MODERATE: 2, LOW: 1 };

function daysBetween(a, b) {
  if (!a || !b) return null;
  const ms = new Date(b) - new Date(a);
  if (Number.isNaN(ms) || ms < 0) return null;
  return Math.round(ms / 86400000);
}

function deriveRiskLevel(events) {
  let best = "LOW";
  for (const e of events) {
    const rank = SEVERITY_RANK[e.severity] || 0;
    if (rank === 3) return "HIGH";
    if (rank === 2) best = "MEDIUM";
  }
  return best;
}

function mapEvents(events) {
  return events
    .slice()
    .sort((a, b) => (a.depth_md_m ?? 0) - (b.depth_md_m ?? 0))
    .map((e) => ({
      depth: e.depth_md_m,
      type: eventTypeToTitle(e.event_type),
      severity: riskToFrontend(e.severity),
      description: e.description,
      mitigation: e.mitigation,
      npt: npt(e.npt_hours),
    }));
}

function mapFormations(formations) {
  return formations.map((f) => ({
    formation: f.formation,
    topDepth: f.top_md_m,
    bottomDepth: f.base_md_m,
    lithology: f.lithology,
    historicalRisk: riskToFrontend(f.formation_risk),
  }));
}

function mapCasing(casing) {
  return casing.map((c) => ({
    casingSize: c.casing_size,
    settingDepth: c.set_depth_m != null ? `${c.set_depth_m} m` : null,
    cementType: c.grade,
    cementVolume: c.slurry_volume_bbl != null ? `${c.slurry_volume_bbl} bbl` : null,
    status: c.cement_result || c.status,
  }));
}

function deriveLessonsLearned(realWellId, events) {
  return events
    .filter((e) => (SEVERITY_RANK[e.severity] || 0) >= 2)
    .slice(0, 5)
    .map((e, i) => ({
      id: `LL-${realWellId}-${i + 1}`,
      title: `${eventTypeToTitle(e.event_type)} at ${Math.round(e.depth_md_m)} m`,
      observation: e.description,
      mitigation: e.mitigation || "No documented mitigation on file for this event.",
    }));
}

function deriveRiskIntervals(formations) {
  return formations.map((f) => ({
    from: f.top_md_m,
    to: f.base_md_m,
    level: riskToFrontend(f.formation_risk) === "HIGH" ? "HIGH" : riskToFrontend(f.formation_risk) === "MEDIUM" ? "MEDIUM" : "NORMAL",
    label: `${f.formation} (${f.lithology || "lithology n/a"})`,
  }));
}

/** Build the full nested well object for a real well_id, tagged with its demo id. */
function buildWellDetail(realWellId, demoId, distanceKm) {
  const store = getStore();
  const well = store.getWell(realWellId);
  if (!well) return null;
  const events = store.eventsFor(realWellId);
  const formations = store.formationsFor(realWellId);
  const casing = store.casingFor(realWellId);
  const hasType = (t) => events.some((e) => e.event_type === t);
  const totalNpt = events.reduce((sum, e) => sum + (e.npt_hours || 0), 0);

  return {
    // Falls back to the real dataset id when there's no demo-id mapping (e.g. wells that
    // were added to enrich the dataset -- like Mumbai High -- but were deliberately not
    // wired into the fixed OIL-DEMO-* mapping in wellIdMap.js).
    id: demoId || realWellId,
    realId: realWellId,
    name: well.well_name,
    lat: well.surface_lat,
    lon: well.surface_lon,
    distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : 0,
    totalDepth: well.actual_td_m,
    currentDepth: well.actual_td_m,
    targetDepth: well.planned_td_m,
    formation: formations.length ? formations[formations.length - 1].formation : null,
    status: well.well_status,
    riskLevel: deriveRiskLevel(events),
    spudYear: well.spud_date ? Number(well.spud_date.slice(0, 4)) : null,
    field: well.field,
    rigName: well.rig_name,
    drillingDuration: (() => {
      const d = daysBetween(well.spud_date, well.rig_release_date);
      return d != null ? `${d} days` : null;
    })(),
    mudLoss: hasType("MUD_LOSS") ? "Yes" : "No",
    stuckPipe: hasType("STUCK_PIPE") ? "Yes" : "No",
    nptHours: Math.round(totalNpt),
    historicalEvents: mapEvents(events),
    formations: mapFormations(formations),
    casingPrograms: mapCasing(casing),
    lessonsLearned: deriveLessonsLearned(realWellId, events),
    riskIntervals: deriveRiskIntervals(formations),
  };
}

module.exports = { buildWellDetail };
