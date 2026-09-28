const test = require('node:test');
const assert = require('node:assert/strict');

const {
  addReading,
  clearReadings,
  median,
} = require('../src/services/reading-stability.service');

test.afterEach(() => {
  clearReadings();
});

test('calculates median without being distorted by a spike', () => {
  assert.equal(median([10, 11, 100]), 11);
});

test('reports readiness after the configured sample window', () => {
  const previous =
    process.env.READING_STABILITY_WINDOW;
  process.env.READING_STABILITY_WINDOW = '3';

  addReading('device-1', {
    ph: 7,
    tds: 100,
    turbidity: 10,
    temperature: 25,
  });
  addReading('device-1', {
    ph: 9,
    tds: 110,
    turbidity: 100,
    temperature: 26,
  });
  const result = addReading('device-1', {
    ph: 7.2,
    tds: 105,
    turbidity: 11,
    temperature: 25.5,
  });

  assert.equal(result.isStable, true);
  assert.equal(result.values.turbidity, 11);

  if (previous === undefined) {
    delete process.env.READING_STABILITY_WINDOW;
  } else {
    process.env.READING_STABILITY_WINDOW = previous;
  }
});
