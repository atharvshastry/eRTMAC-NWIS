/**
 * Server-side copy of the same keyword/heuristic domain gate used by the frontend chatbot widget
 * (frontend/src/utils/chatbotTopicGuard.js) -- duplicated rather than shared because the two run
 * in different runtimes (browser vs Node) with no shared module boundary in this repo. Keep the
 * keyword list and logic in sync if either changes. See the frontend copy's header comment for the
 * full rationale (deliberately conservative: errs toward letting a question through).
 */

const DOMAIN_KEYWORDS = [
  // Core domain nouns
  "well", "wells", "wellbore", "drilling", "drill", "driller", "rig", "oilfield", "oil field",
  "petroleum", "hydrocarbon", "reservoir", "basin", "field", "spud", "workover", "completion",
  // Formations / geology
  "formation", "lithology", "geology", "geological", "stratigraph", "sandstone", "shale",
  "limestone", "claystone", "siltstone", "alluvium", "sand", "porosity", "permeability",
  "fracture", "pay zone", "coal", "girujan", "tipam", "barail", "kopili", "lakadong", "sylhet",
  "demo formation", "assam-arakan", "assam arakan",
  // Casing / cementing
  "casing", "cement", "cementing", "slurry", "liner", "cbl", "vdl", "squeeze",
  // Drilling parameters / telemetry
  "rop", "wob", "rpm", "torque", "spp", "ecd", "hookload", "mud weight", "mud loss",
  "circulation loss", "flow rate", "pump rate", "depth", "md", "tvd", "measured depth",
  "true vertical", "inclination", "azimuth", "trajectory", "survey", "directional",
  // Events / incidents / risk
  "stuck pipe", "kick", "blowout", "bop", "npt", "non-productive", "non productive",
  "lost circulation", "lcm", "fishing operation", "differential sticking", "overpull",
  "risk", "hazard", "alert", "incident", "mitigation", "lessons learned", "offset well",
  "nearby well", "correlat",
  // App / dataset vocabulary
  "ertmac", "nwis", "oil india", "oil-demo", "oil-syn", "ddr", "wcr", "drilling report",
  "well completion report", "rig name", "target depth", "total depth", "spudded",
  // Broader terms that show up in natural paraphrasing of a real drilling question, not just the
  // exact multi-word phrases above -- widened after real usage showed reasonable questions
  // ("why did the pipe get stuck near well 2?") missing every listed phrase.
  "pipe", "drillstring", "drill string", "bit", "hole", "borehole", "logging", "log",
  "influx", "overbalance", "underbalance", "gas kick", "pit volume", "pump", "annulus",
  "event", "events", "incident", "incidents", "record", "records", "history", "historical",
  "nearby", "similar well", "evidence", "confidence", "severity", "zone", "interval",
];

const WELL_ID_PATTERN = /\boil[-_]?(demo|syn)[-_]?[a-z0-9-]+/i;

function isOnTopicQuestion(prompt) {
  const p = (prompt || "").trim().toLowerCase();
  if (!p) return true;
  if (WELL_ID_PATTERN.test(p)) return true;
  if (DOMAIN_KEYWORDS.some((kw) => p.includes(kw))) return true;
  if (p.split(/\s+/).filter(Boolean).length <= 4) return true;
  return false;
}

module.exports = { isOnTopicQuestion };
