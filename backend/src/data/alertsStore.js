/**
 * In-memory, evidence-backed alert store. Every alert here is built directly from the
 * Python AI service's calibrated risk engine (POST/GET /risk/assess or /risk/live) --
 * nothing here is randomly generated. `drillingSimulator.js` calls `addFromAssessment`
 * as the simulated well advances; `alerts.routes.js` seeds it once at boot and serves
 * reads/writes for the Alerts page.
 *
 * Resets on server restart -- fine for a hackathon demo, and consistent with the Python
 * side's own AlertTracker (also in-memory, per app/risk.py).
 */
const { toDemoId } = require("./wellIdMap");

const BAND_TO_SEVERITY = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" };

let _alerts = []; // newest first
let _seq = 1;

function pyAlertToNode(pyAlert, demoWellId, depth) {
  const top = pyAlert.evidence && pyAlert.evidence[0];
  const now = new Date();
  const id = `ALT-${Math.round(depth)}-${String(_seq++).padStart(2, "0")}`;
  return {
    id,
    severity: BAND_TO_SEVERITY[pyAlert.band] || "Low",
    type: pyAlert.label,
    wellId: demoWellId,
    currentDepth: Math.round(depth),
    formation: top ? top.formation : null,
    detectionTime: now.toTimeString().slice(0, 5),
    detectionDate: now.toISOString().slice(0, 10),
    status: "Active",
    isHistoricalPattern: true,
    shortDescription: pyAlert.message,
    observation: pyAlert.message,
    zoneFromM: pyAlert.zone_from_m,
    zoneToM: pyAlert.zone_to_m,
    expectedNptH: pyAlert.expected_npt_h,
    wellsWithEvent: pyAlert.wells_with_event,
    wellsConsidered: pyAlert.wells_considered,
    evidence: top
      ? {
          relatedWell: toDemoId(top.well_id),
          historicalDepth: top.depth_md_m,
          historicalEvent: top.description || pyAlert.label,
          similarity: Math.round(pyAlert.score * 100),
          sourceDocument: `event ${top.event_id} (well ${top.well_id})`,
        }
      : null,
    recommendation: top
      ? {
          historicalEvent: top.description || pyAlert.label,
          historicalObservation: top.description || pyAlert.message,
          historicalMitigation:
            top.mitigation ||
            (pyAlert.recommended_actions && pyAlert.recommended_actions[0]) ||
            "No documented mitigation on file for this event.",
          outcome:
            top.npt_hours != null
              ? `Offset well logged ~${top.npt_hours}h NPT for this event.`
              : "Outcome not recorded in the historical log.",
          sourceWell: toDemoId(top.well_id),
          sourceDocument: `event ${top.event_id} (well ${top.well_id})`,
        }
      : null,
  };
}

/** Convert a Python /risk/assess or /risk/live "alerts" array into stored alerts and prepend them. */
function addFromAssessment(pyAlerts, demoWellId, depth) {
  if (!pyAlerts || !pyAlerts.length) return [];
  const created = pyAlerts.map((a) => pyAlertToNode(a, demoWellId, depth));
  _alerts = [...created, ..._alerts].slice(0, 200); // cap so a long-running demo doesn't grow unbounded
  return created;
}

function list() {
  return _alerts;
}

function findById(id) {
  return _alerts.find((a) => a.id === id) || null;
}

function updateStatus(id, status) {
  const a = findById(id);
  if (a) a.status = status;
  return a;
}

function summary() {
  return {
    total: _alerts.length,
    active: _alerts.filter((a) => a.status === "Active").length,
    critical: _alerts.filter((a) => a.severity === "High" && a.status !== "Resolved").length,
    historicalPattern: _alerts.filter((a) => a.isHistoricalPattern && a.status !== "Resolved").length,
    acknowledged: _alerts.filter((a) => a.status === "Acknowledged").length,
    resolved: _alerts.filter((a) => a.status === "Resolved").length,
  };
}

function timeline() {
  return _alerts.slice(0, 30).map((a) => ({
    id: a.id,
    time: a.detectionTime,
    depth: `${a.currentDepth.toLocaleString("en-US")} m`,
    event: a.shortDescription,
    severity: a.severity,
    status: a.status,
    wellId: a.wellId,
  }));
}

module.exports = { addFromAssessment, list, findById, updateStatus, summary, timeline };
