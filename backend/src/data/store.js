/**
 * CSV-backed data layer for the Node backend -- reads the SAME dataset the Python AI
 * service uses (nwis-ai/nwis-ai/data/*.csv), so both services are always looking at one
 * source of truth with zero sync risk. This intentionally mirrors app/data.py's `Store`
 * on the Python side; keep the two in sync if the dataset's shape ever changes.
 *
 * This is the "fast structured reads" half of the backend (wells, nearby, formations,
 * casing, events) -- lists and joins over the shared CSVs, no ML involved. Anything that
 * needs the calibrated risk model, hybrid search/RAG, or PDF/OCR extraction goes through
 * the Python AI service instead (see src/config/aiService.js); this file never calls it.
 *
 * Swap point: once sql/schema.sql is applied to a live Postgres+PostGIS instance, this
 * file is the one to replace with `pool.query` calls -- everything that imports
 * `getStore()` keeps working unchanged as long as the returned shape matches.
 */
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const DATA_DIR = path.resolve(
  __dirname,
  // backend/src/data/store.js -> ../../.. is the repo root, then into nwis-ai/data (the Python
  // service's data folder, shared with the Node backend). Was "../../../../nwis-ai/data" before
  // backend/121_backend/ was collapsed into backend/ -- one level shallower now.
  process.env.NWIS_DATA_DIR || "../../../nwis-ai/data"
);

function readCsv(name) {
  const filePath = path.join(DATA_DIR, `${name}.csv`);
  const text = fs.readFileSync(filePath, "utf8");
  return parse(text, { columns: true, skip_empty_lines: true, bom: true });
}

// Minimal RFC 4180 field escaping for appending a single row to a CSV file on disk (notes are
// free text and may contain commas/quotes/newlines). Deliberately hand-rolled rather than a new
// dependency -- this project has no csv-stringify package installed, and the column set here is
// small and fully controlled.
function csvEscapeField(value) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function appendCsvRow(name, values) {
  const filePath = path.join(DATA_DIR, `${name}.csv`);
  const line = values.map(csvEscapeField).join(",") + "\n";
  fs.appendFileSync(filePath, line, "utf8");
}

function num(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function groupBy(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const k = r[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0088;
  const toRad = (d) => (d * Math.PI) / 180;
  const dphi = toRad(lat2 - lat1);
  const dlmb = toRad(lon2 - lon1);
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlmb / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

class Store {
  constructor() {
    this.wells = new Map();
    for (const r of readCsv("wells")) {
      this.wells.set(r.well_id, {
        well_id: r.well_id,
        well_name: r.well_name,
        field: r.field,
        asset: r.asset,
        rig_name: r.rig_name,
        spud_date: r.spud_date || null,
        rig_release_date: r.rig_release_date || null,
        surface_lat: num(r.surface_lat),
        surface_lon: num(r.surface_lon),
        planned_td_m: num(r.planned_td_m),
        actual_td_m: num(r.actual_td_m),
        well_type: r.well_type,
        well_status: r.well_status,
        data_status: r.data_status,
      });
    }

    this.events = readCsv("operational_events").map((r) => ({
      event_id: r.event_id,
      well_id: r.well_id,
      event_type: r.event_type,
      severity: r.severity,
      depth_md_m: num(r.depth_md_m),
      depth_tvd_m: num(r.depth_tvd_m),
      start_time: r.start_time,
      end_time: r.end_time,
      formation: r.formation,
      description: r.description,
      mitigation: r.mitigation,
      npt_hours: num(r.npt_hours),
      record_status: r.record_status,
    }));
    this.eventsByWell = groupBy(this.events, "well_id");

    this.formations = readCsv("formation_log").map((r) => ({
      well_id: r.well_id,
      formation: r.formation,
      top_md_m: num(r.top_md_m),
      base_md_m: num(r.base_md_m),
      lithology: r.lithology,
      reservoir_quality_index: num(r.reservoir_quality_index),
      formation_risk: r.formation_risk,
    }));
    this.formationsByWell = groupBy(this.formations, "well_id");
    for (const list of this.formationsByWell.values()) list.sort((a, b) => a.top_md_m - b.top_md_m);

    this.casing = readCsv("casing_cement").map((r) => ({
      casing_job_id: r.casing_job_id,
      well_id: r.well_id,
      casing_size: r.casing_size,
      set_depth_m: num(r.set_depth_m),
      grade: r.grade,
      status: r.status,
      cement_yield_ft3sk: num(r.cement_yield_ft3sk),
      slurry_volume_bbl: num(r.slurry_volume_bbl),
      cement_result: r.cement_result,
    }));
    this.casingByWell = groupBy(this.casing, "well_id");

    this.mud = readCsv("mud_report").map((r) => ({
      well_id: r.well_id,
      report_date: r.report_date,
      depth_md_m: num(r.depth_md_m),
      mud_weight_sg: num(r.mud_weight_sg),
      mud_system: r.mud_system,
      treatment: r.treatment,
    }));
    this.mudByWell = groupBy(this.mud, "well_id");

    this.trajectory = readCsv("trajectory").map((r) => ({
      well_id: r.well_id,
      md_m: num(r.md_m),
      tvd_m: num(r.tvd_m),
      inclination_deg: num(r.inclination_deg),
      azimuth_deg: num(r.azimuth_deg),
      // northing_m/easting_m: local horizontal offsets from surface location, used to plot real
      // 3D wellbore trajectories (see routes/wells.routes.js's GET /:wellId/trajectory).
      northing_m: num(r.northing_m),
      easting_m: num(r.easting_m),
    }));
    this.trajectoryByWell = groupBy(this.trajectory, "well_id");

    // Real eRTMAC-format telemetry rows -- this is what drillingSimulator.js replays/extends to
    // simulate the live feed, instead of fabricating parameter values from nothing.
    this.realtime = readCsv("ertmac_realtime").map((r) => ({
      timestamp: r.timestamp,
      well_id: r.well_id,
      md_m: num(r.md_m),
      tvd_m: num(r.tvd_m),
      formation: r.formation,
      activity_phase: r.activity_phase,
      rop_m_hr: num(r.rop_m_hr),
      wob_klbf: num(r.wob_klbf),
      rpm: num(r.rpm),
      torque_kNm: num(r.torque_kNm),
      spp_kPa: num(r.spp_kPa),
      hookload_kN: num(r.hookload_kN),
      flow_in_lpm: num(r.flow_in_lpm),
      flow_out_pct: num(r.flow_out_pct),
      mud_weight_sg: num(r.mud_weight_sg),
      pit_volume_bbl: num(r.pit_volume_bbl),
      ecd_sg: num(r.ecd_sg),
      gamma_api: num(r.gamma_api),
      total_gas_pct: num(r.total_gas_pct),
      event_code: r.event_code || null,
    }));
    this.realtimeByWell = groupBy(this.realtime, "well_id");
    for (const list of this.realtimeByWell.values()) list.sort((a, b) => a.md_m - b.md_m);

    // Team roster + key-officer contacts per well (see data/well_personnel.csv's generation
    // script for how these were built -- rig crew shared across every well that rig drilled,
    // field-level officers shared across every well in that field; all names/contacts are
    // synthetic, never real OIL India personnel).
    this.personnel = readCsv("well_personnel").map((r) => ({
      well_id: r.well_id,
      name: r.name,
      designation: r.designation,
      is_key_officer: String(r.is_key_officer).toUpperCase() === "TRUE",
      email: r.email,
      phone: r.phone,
      current_posting: r.current_posting,
    }));
    this.personnelByWell = groupBy(this.personnel, "well_id");

    // Free-text engineer notes per well -- the app's first write-capable data. Loaded from CSV
    // like everything else, but addNote() below also appends new ones back to that same file so
    // they survive a server restart, not just this process's lifetime.
    this.notes = readCsv("well_notes").map((r) => ({
      note_id: r.note_id,
      well_id: r.well_id,
      author: r.author,
      timestamp: r.timestamp,
      text: r.text,
    }));
    this.notesByWell = groupBy(this.notes, "well_id");
    for (const list of this.notesByWell.values()) {
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // newest first
    }
  }

  wellList() {
    return [...this.wells.values()];
  }

  getWell(id) {
    return this.wells.get(id) || null;
  }

  historicalIds() {
    return this.wellList().filter((w) => w.data_status === "HISTORICAL").map((w) => w.well_id);
  }

  activeIds() {
    return this.wellList().filter((w) => w.data_status === "ACTIVE").map((w) => w.well_id);
  }

  /** Historical + other wells within radiusKm of wellId's surface location, nearest first. */
  nearby(wellId, radiusKm = 30) {
    const origin = this.getWell(wellId);
    if (!origin || origin.surface_lat == null) return [];
    const out = [];
    for (const w of this.wellList()) {
      if (w.well_id === wellId || w.surface_lat == null) continue;
      const d = haversineKm(origin.surface_lat, origin.surface_lon, w.surface_lat, w.surface_lon);
      if (d <= radiusKm) out.push({ well: w, distanceKm: d });
    }
    out.sort((a, b) => a.distanceKm - b.distanceKm);
    return out;
  }

  eventsFor(wellId) {
    return this.eventsByWell.get(wellId) || [];
  }

  formationsFor(wellId) {
    return this.formationsByWell.get(wellId) || [];
  }

  casingFor(wellId) {
    return this.casingByWell.get(wellId) || [];
  }

  mudFor(wellId) {
    return this.mudByWell.get(wellId) || [];
  }

  personnelFor(wellId) {
    return this.personnelByWell.get(wellId) || [];
  }

  notesFor(wellId) {
    return this.notesByWell.get(wellId) || [];
  }

  /** Appends a new note for wellId to well_notes.csv AND the in-memory index, so it's both
   * immediately visible and durable across a server restart. Throws if the disk write fails,
   * in which case nothing is added to the in-memory index either (stays consistent with disk). */
  addNote(wellId, { author, text }) {
    const note = {
      note_id: `NOTE-${wellId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      well_id: wellId,
      author: (author || "Field Engineer").trim(),
      timestamp: new Date().toISOString(),
      text: (text || "").trim(),
    };
    appendCsvRow("well_notes", [note.note_id, note.well_id, note.author, note.timestamp, note.text]);
    this.notes.push(note);
    if (!this.notesByWell.has(wellId)) this.notesByWell.set(wellId, []);
    this.notesByWell.get(wellId).unshift(note); // newest first, matches the sort order at load time
    return note;
  }

  realtimeFor(wellId) {
    return this.realtimeByWell.get(wellId) || [];
  }

  /** Formation name at a measured depth -- same overlap/gap rule as app/data.py::Store.formation_at. */
  formationAt(wellId, md) {
    const ivs = this.formationsFor(wellId);
    if (!ivs.length || md == null) return null;
    const inside = ivs.filter((iv) => iv.top_md_m <= md && md <= iv.base_md_m);
    if (inside.length) return inside[inside.length - 1].formation;
    let nearest = null;
    let nearestDist = Infinity;
    for (const iv of ivs) {
      const d = Math.min(Math.abs(md - iv.top_md_m), Math.abs(md - iv.base_md_m));
      if (d < nearestDist) {
        nearestDist = d;
        nearest = iv;
      }
    }
    return nearest && nearestDist <= 150 ? nearest.formation : null;
  }
}

let _store = null;
function getStore() {
  if (!_store) _store = new Store();
  return _store;
}

module.exports = { getStore, haversineKm, DATA_DIR };
