/**
 * Shared vocabulary translation between the Python dataset's event_type enum
 * (MUD_LOSS/STUCK_PIPE/KICK/TORQUE_SPIKE/CEMENTING_ISSUE/NPT) and the frontend's
 * Title Case labels (mockKnowledge.js's EVENT_TYPES, mockWells.js's historicalEvents[].type).
 * Kept in one place so wells/alerts/search routes stay consistent with each other.
 */
const TO_TITLE = {
  MUD_LOSS: "Mud Loss",
  STUCK_PIPE: "Stuck Pipe",
  KICK: "Kick",
  TORQUE_SPIKE: "Torque Spike",
  CEMENTING_ISSUE: "Cementing Issue",
  NPT: "NPT",
};

const TO_ENUM = {
  "Mud Loss": "MUD_LOSS",
  "Stuck Pipe": "STUCK_PIPE",
  Kick: "KICK",
  "Torque Spike": "TORQUE_SPIKE",
  Cementing: "CEMENTING_ISSUE",
  "Cementing Issue": "CEMENTING_ISSUE",
  NPT: "NPT",
};

// formation_risk / severity in the CSVs use MODERATE where the frontend's mock data uses MEDIUM.
const RISK_TO_FRONTEND = { HIGH: "HIGH", MODERATE: "MEDIUM", MEDIUM: "MEDIUM", LOW: "LOW", CRITICAL: "HIGH" };

function eventTypeToTitle(enumVal) {
  return TO_TITLE[enumVal] || enumVal;
}

function eventTypeToEnum(titleVal) {
  return TO_ENUM[titleVal];
}

function riskToFrontend(val) {
  return RISK_TO_FRONTEND[val] || val;
}

function npt(hours) {
  if (hours === null || hours === undefined) return "N/A";
  return `${hours} hr`;
}

module.exports = { eventTypeToTitle, eventTypeToEnum, riskToFrontend, npt };
