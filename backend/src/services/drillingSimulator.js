/**
 * Simulates the live eRTMAC feed for the one ACTIVE well (OIL-SYN-ACTIVE-01 / OIL-DEMO-001),
 * since PS 26121 has no real feed to connect to. Rather than fabricate parameter values from
 * nothing, this REPLAYS the well's own real recorded telemetry (data/ertmac_realtime.csv --
 * 220 real rows from 1000m to 2860m, in genuine eRTMAC column format: rop/wob/torque/rpm/spp/
 * flow/mud-weight/ecd/hookload). Once it runs past the recorded rows it extrapolates forward
 * from the last real row (small jitter, same units) so the well keeps drilling into territory
 * the dataset snapshot hadn't reached yet -- exactly where the offset-well risk model's
 * forward-looking predictions matter, since there's no incident history of its own to fall
 * back on. On reaching the planned total depth it loops back to the top and asks the AI
 * service to reset that well's alert tracker, so a long-running demo keeps generating fresh,
 * evidence-backed alerts instead of going quiet.
 *
 * On every tick this also calls the Python AI service's /risk/live (stateful, deduplicating
 * AlertTracker) for the live depth, and for any genuinely NEW alert: stores it in
 * alertsStore.js and emits it over Socket.io ("drilling-alert") via the existing
 * src/utils/socketAlerts.js -- unchanged from the original backend.
 */
const { getStore } = require("../data/store");
const { toDemoId, activeRecord } = require("../data/wellIdMap");
const { aiGet } = require("../config/aiService");
const alertsStore = require("../data/alertsStore");
const emitAlert = require("../utils/socketAlerts"); // default export: emitAlert(wellId, alert)

const TICK_MS = Number(process.env.DRILLING_TICK_MS || 4000);
const EXTRAPOLATE_STEP_M = 9; // ~ the average row-to-row spacing seen in the recorded data
const JITTER = 0.05; // +/-5% on extrapolated parameters

const KLBF_TO_TONNES = 0.4536;
const KPA_TO_PSI = 0.145038;
const KN_TO_TONNES = 0.10197;
const SG_TO_PPG = 8.345;

function jitter(v, frac = JITTER) {
  if (v == null) return v;
  return v * (1 + (Math.random() * 2 - 1) * frac);
}

class DrillingSimulator {
  constructor() {
    this._started = false;
    this._timer = null;
    this._cursor = 0;
    this._extrapolating = false;
    this._current = null; // last realtime-shaped row (real or extrapolated)
    this._lastAssessment = null; // last /risk/live result
    this._demoId = null;
    this._realId = null;
    this._plannedTd = null;
    this._rows = [];
  }

  start() {
    if (this._started) return;
    const store = getStore();
    const { demoId, realId, well } = activeRecord();
    this._demoId = demoId;
    this._realId = realId;
    this._plannedTd = (well && well.planned_td_m) || 3650;
    this._rows = store.realtimeFor(realId);
    if (!this._rows.length) {
      // eslint-disable-next-line no-console
      console.warn(`[drillingSimulator] no ertmac_realtime rows found for ${realId}; simulator idle`);
      return;
    }
    this._current = { ...this._rows[0] };
    this._started = true;
    this._timer = setInterval(() => this._tick().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[drillingSimulator] tick failed:", err.message);
    }), TICK_MS);
    // Fire once immediately so state isn't empty for the first few seconds after boot.
    this._tick().catch(() => {});
  }

  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    this._started = false;
  }

  _advanceRow() {
    const store = getStore();
    if (this._cursor < this._rows.length) {
      this._current = { ...this._rows[this._cursor] };
      this._cursor += 1;
      this._extrapolating = false;
      return;
    }
    // Past the recorded snapshot: keep drilling deeper using the last row as a baseline.
    this._extrapolating = true;
    const prev = this._current;
    const nextMd = Math.min(prev.md_m + EXTRAPOLATE_STEP_M, this._plannedTd);
    const tvdRatio = prev.tvd_m / prev.md_m;
    const formation = store.formationAt(this._realId, nextMd) || prev.formation;
    this._current = {
      ...prev,
      md_m: nextMd,
      tvd_m: Math.round(nextMd * tvdRatio * 10) / 10,
      formation,
      rop_m_hr: Math.max(4, jitter(prev.rop_m_hr)),
      wob_klbf: Math.max(5, jitter(prev.wob_klbf)),
      rpm: Math.max(20, jitter(prev.rpm)),
      torque_kNm: Math.max(3, jitter(prev.torque_kNm)),
      spp_kPa: Math.max(1000, jitter(prev.spp_kPa)),
      hookload_kN: Math.max(50, jitter(prev.hookload_kN)),
      flow_in_lpm: Math.max(500, jitter(prev.flow_in_lpm)),
      mud_weight_sg: jitter(prev.mud_weight_sg, 0.015),
      ecd_sg: jitter(prev.ecd_sg, 0.015),
      total_gas_pct: Math.max(0, jitter(prev.total_gas_pct, 0.3)),
    };

    if (nextMd >= this._plannedTd) {
      // Reached planned TD -- loop back to the top of the recorded log and ask the AI
      // service to clear this well's alert history, so a long demo keeps producing fresh,
      // evidence-backed alerts instead of going quiet forever.
      this._cursor = 0;
      this._current = { ...this._rows[0] };
      this._extrapolating = false;
      aiGet("/risk/live", { well_id: this._realId, depth_md_m: this._rows[0].md_m, reset: true }).catch(() => {});
    }
  }

  async _tick() {
    this._advanceRow();
    const depth = this._current.md_m;

    try {
      const result = await aiGet("/risk/live", {
        well_id: this._realId,
        depth_md_m: depth,
        lookahead_m: 150,
        radius_km: 40,
        min_band: "MEDIUM",
      });
      this._lastAssessment = result;
      const created = alertsStore.addFromAssessment(result.new_alerts, this._demoId, depth);
      for (const alert of created) {
        emitAlert(this._demoId, alert);
      }
    } catch (err) {
      // AI service not reachable this tick -- keep the telemetry replay going regardless,
      // the widget/parameters still update from the real recorded/extrapolated data.
      // eslint-disable-next-line no-console
      console.warn("[drillingSimulator] /risk/live unreachable:", err.message);
    }
  }

  /** Current state in the shape the frontend's drilling-live contract + other routes need. */
  getState() {
    if (!this._current) return null;
    const c = this._current;
    const parameters = [
      { key: "depth", label: "Depth", unit: "m", value: round(c.md_m, 1) },
      { key: "rop", label: "ROP", unit: "m/hr", value: round(c.rop_m_hr, 1) },
      { key: "wob", label: "WOB", unit: "tons", value: round(c.wob_klbf * KLBF_TO_TONNES, 1) },
      { key: "torque", label: "Torque", unit: "kNm", value: round(c.torque_kNm, 1) },
      { key: "rpm", label: "RPM", unit: "rpm", value: round(c.rpm, 0) },
      { key: "spp", label: "Standpipe Pressure", unit: "psi", value: round(c.spp_kPa * KPA_TO_PSI, 0) },
      { key: "mudFlow", label: "Mud Flow", unit: "lpm", value: round(c.flow_in_lpm, 0) },
      { key: "mudWeight", label: "Mud Weight", unit: "ppg", value: round(c.mud_weight_sg * SG_TO_PPG, 2) },
      { key: "hookLoad", label: "Hook Load", unit: "tons", value: round(c.hookload_kN * KN_TO_TONNES, 0) },
      { key: "ecd", label: "ECD", unit: "ppg", value: round(c.ecd_sg * SG_TO_PPG, 2) },
    ];
    return {
      demoId: this._demoId,
      realId: this._realId,
      depthM: c.md_m,
      tvdM: c.tvd_m,
      formation: c.formation,
      activityPhase: c.activity_phase,
      totalGasPct: c.total_gas_pct,
      isExtrapolated: this._extrapolating,
      parameters,
      assessment: this._lastAssessment,
      timestamp: new Date().toISOString(),
    };
  }
}

function round(v, d) {
  if (v == null || Number.isNaN(v)) return null;
  const m = 10 ** d;
  return Math.round(v * m) / m;
}

const simulator = new DrillingSimulator();
module.exports = simulator;
