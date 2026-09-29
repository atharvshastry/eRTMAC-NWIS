const { getIO } = require("../socket");

function emitAlert(wellId, alert) {
  const io = getIO();

  io.emit("drilling-alert", {
    wellId,
    ...alert,
    timestamp: new Date().toISOString()
  });
}

module.exports = emitAlert;