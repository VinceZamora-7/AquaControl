const DEFAULT_WINDOW_SIZE = 5;

const SENSOR_KEYS = [
  'ph',
  'tds',
  'turbidity',
  'temperature',
];

const deviceWindows = new Map();

function getWindowSize() {
  const configured = Number(
    process.env.READING_STABILITY_WINDOW
  );

  if (
    Number.isInteger(configured) &&
    configured >= 1 &&
    configured <= 20
  ) {
    return configured;
  }

  return DEFAULT_WINDOW_SIZE;
}

function median(values) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort(
    (a, b) => a - b
  );
  const middle = Math.floor(
    sorted.length / 2
  );

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function addReading(deviceCode, reading) {
  const windowSize = getWindowSize();
  const samples =
    deviceWindows.get(deviceCode) || [];

  samples.push(reading);

  if (samples.length > windowSize) {
    samples.splice(
      0,
      samples.length - windowSize
    );
  }

  deviceWindows.set(deviceCode, samples);

  const filtered = {};

  for (const key of SENSOR_KEYS) {
    filtered[key] = median(
      samples
        .map((sample) => sample[key])
        .filter(Number.isFinite)
    );
  }

  return {
    method: 'rolling_median',
    sampleCount: samples.length,
    requiredSamples: windowSize,
    isStable: samples.length >= windowSize,
    values: filtered,
  };
}

function clearReadings() {
  deviceWindows.clear();
}

module.exports = {
  addReading,
  clearReadings,
  median,
};
