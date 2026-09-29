const pool = require("../config/db");
const emitAlert = require("../utils/socketAlerts");

async function checkRealtimeAlert(wellId) {

  // Get latest realtime drilling data
  const realtimeResult = await pool.query(
    `
    SELECT *
    FROM ertmac_realtime
    WHERE well_id = $1
    ORDER BY timestamp DESC
    LIMIT 1
    `,
    [wellId]
  );

  if (realtimeResult.rows.length === 0) {
    return null;
  }

  const realtime = realtimeResult.rows[0];

  // Find historical events near the current depth
  const eventResult = await pool.query(
    `
    SELECT *
    FROM operational_events
    WHERE depth_m BETWEEN $1 AND $2
    ORDER BY depth_m
    `,
    [
      Number(realtime.depth_m) - 100,
      Number(realtime.depth_m) + 100
    ]
  );

  if (eventResult.rows.length === 0) {
    return null;
  }

  const event = eventResult.rows[0];

  const alert = {
    severity: event.severity,
    eventType: event.event_type,
    currentDepth: realtime.depth_m,
    historicalDepth: event.depth_m,
    message:
      `Historical ${event.event_type} event found near current drilling depth.`,
    historicalEventId: event.event_id
  };

  // Send alert to connected frontend clients
  emitAlert(wellId, alert);

  return alert;
}

module.exports = {
  checkRealtimeAlert
};