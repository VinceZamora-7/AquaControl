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

module.exports = {
  setIO,
  getIO,
  emitSensorReading,
};