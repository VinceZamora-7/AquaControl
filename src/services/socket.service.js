let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function getIO() {
  return ioInstance;
}

function emitSensorReading(deviceCode, reading) {
  if (!ioInstance) {
    return;
  }

  ioInstance
    .to(`device:${deviceCode}`)
    .emit('sensor:reading', reading);
}

function emitWaterQualityAlert(deviceCode, notification) {
  if (!ioInstance) {
    return;
  }

  ioInstance
    .to(`device:${deviceCode}`)
    .emit('water:discrepancy', notification);
}

module.exports = {
  setIO,
  getIO,
  emitSensorReading,
  emitWaterQualityAlert,
};
