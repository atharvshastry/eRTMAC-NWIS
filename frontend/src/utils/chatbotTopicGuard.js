/**
 * Keeps the drilling-advisory chatbot scoped to drilling/wells questions. This app's chatbot is
 * meant to answer from real eRTMAC-NWIS well records (formations, casing, historical events, risk,
 * offset wells) -- not to act as a general-purpose assistant. Off-topic questions are declined
 * locally, before any API call, so the check works identically whether the backend is reachable or
 * not (and doesn't waste a round-trip on something we're not going to answer anyway).
 *
 * This is a plain keyword/heuristic gate, not an LLM classifier -- deliberately conservative
 * (errs toward letting a question through) since a false "off-topic" decline on a real drilling
 * question would be worse than occasionally answering something borderline.
 */

const DOMAIN_KEYWORDS = [
  // Core domain nouns
  'well', 'wells', 'wellbore', 'drilling', 'drill', 'driller', 'rig', 'oilfield', 'oil field',
  'petroleum', 'hydrocarbon', 'reservoir', 'basin', 'field', 'spud', 'workover', 'completion',
  // Formations / geology
  'formation', 'lithology', 'geology', 'geological', 'stratigraph', 'sandstone', 'shale',
  'limestone', 'claystone', 'siltstone', 'alluvium', 'sand', 'porosity', 'permeability',
  'fracture', 'pay zone', 'coal', 'girujan', 'tipam', 'barail', 'kopili', 'lakadong', 'sylhet',
  'demo formation', 'assam-arakan', 'assam arakan',
  // Casing / cementing
  'casing', 'cement', 'cementing', 'slurry', 'liner', 'cbl', 'vdl', 'squeeze',
  // Drilling parameters / telemetry
  'rop', 'wob', 'rpm', 'torque', 'spp', 'ecd', 'hookload', 'mud weight', 'mud loss',
  'circulation loss', 'flow rate', 'pump rate', 'depth', 'md', 'tvd', 'measured depth',
  'true vertical', 'inclination', 'azimuth', 'trajectory', 'survey', 'directional',
  // Events / incidents / risk
  'stuck pipe', 'kick', 'blowout', 'bop', 'npt', 'non-productive', 'non productive',
  'lost circulation', 'lcm', 'fishing operation', 'differential sticking', 'overpull',
  'risk', 'hazard', 'alert', 'incident', 'mitigation', 'lessons learned', 'offset well',
  'nearby well', 'correlat',
  // App / dataset vocabulary
  'ertmac', 'nwis', 'oil india', 'oil-demo', 'oil-syn', 'ddr', 'wcr', 'drilling report',
  'well completion report', 'rig name', 'target depth', 'total depth', 'spudded',
  // Broader terms that show up in natural paraphrasing of a real drilling question, not just the
  // exact multi-word phrases above -- widened after real usage showed reasonable questions
  // ("why did the pipe get stuck near well 2?") missing every listed phrase.
  'pipe', 'drillstring', 'drill string', 'bit', 'hole', 'borehole', 'logging', 'log',
  'influx', 'overbalance', 'underbalance', 'gas kick', 'pit volume', 'pump', 'annulus',
  'event', 'events', 'incident', 'incidents', 'record', 'records', 'history', 'historical',
  'nearby', 'similar well', 'evidence', 'confidence', 'severity', 'zone', 'interval',
];

const WELL_ID_PATTERN = /\boil[-_]?(demo|syn)[-_]?[a-z0-9-]+/i;

// Greetings / meta questions about the assistant itself -- answered with a scope reminder rather
// than declined outright, since they're not really "off-topic content," just not a data question.
const GREETING_PATTERN = /^(hi|hello|hey|yo|help|thanks|thank you|who are you|what (can|do) you|what is this)\b/i;

// Shared by isOnTopicQuestion (full check, with the short-message fallback) and isGreetingOrMeta
// (which needs the keyword/id check alone, without that fallback -- see below for why).
function matchesDomainKeywordsOrId(lowerText) {
  return WELL_ID_PATTERN.test(lowerText) || DOMAIN_KEYWORDS.some((kw) => lowerText.includes(kw));
}

export function isOnTopicQuestion(prompt) {
  const p = (prompt || '').trim().toLowerCase();
  if (!p) return true; // let empty/whitespace fall through to the normal empty-input guard
  if (matchesDomainKeywordsOrId(p)) return true;
  // Short follow-ups ("yes", "why?", "tell me more") are likely continuing an on-topic thread --
  // there's no conversation-level context passed to the backend today, so treat brevity itself as
  // a signal rather than blocking natural back-and-forth.
  if (p.split(/\s+/).filter(Boolean).length <= 4) return true;
  return false;
}

export function isGreetingOrMeta(prompt) {
  const p = (prompt || '').trim();
  const match = GREETING_PATTERN.exec(p);
  if (!match) return false;
  const rest = p.slice(match[0].length).replace(/^[\s,.!?-]+/, '').trim();
  if (!rest) return true; // bare greeting/meta, e.g. "hi", "hello", "thanks"
  // A greeting word can lead into a real drilling question ("hey, what caused the kick near well
  // 3?", "help -- what's the risk on OIL-DEMO-003?"). Only treat the whole message as greeting/meta
  // when nothing resembling an actual on-topic question rides along with it; otherwise this branch
  // was swallowing real questions before they ever reached isOnTopicQuestion.
  return !matchesDomainKeywordsOrId(rest.toLowerCase());
}

export const OFF_TOPIC_MESSAGE =
  "I'm scoped to drilling and well-related questions for eRTMAC-NWIS -- formations, casing, historical events, risk zones, offset wells, and drilling parameters. I can't help with anything outside that. Try asking about a specific well, formation, or type of incident (e.g. \"what mud loss events happened near OIL-DEMO-003?\").";

export const SCOPE_REMINDER_MESSAGE =
  "I'm the eRTMAC drilling advisory assistant -- I answer questions about wells, formations, casing, historical drilling events and risk, grounded in real offset-well records. Ask me something like \"what stuck pipe incidents have occurred nearby?\" or \"summarize the risk for OIL-DEMO-003.\"";
