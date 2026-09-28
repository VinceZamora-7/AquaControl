const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateWaterAlert,
} = require('../src/services/alert.service');

test('marks critical turbidity as a discrepancy', () => {
  const alarm = evaluateWaterAlert({
    ph: 7,
    tds: 100,
    turbidity: 300,
    temperature: 25,
  });

  assert.equal(alarm.active, true);
  assert.equal(alarm.severity, 'CRITICAL');
  assert.match(alarm.reason, /Turbidity/);
});

test('does not alert for normal readings', () => {
  const alarm = evaluateWaterAlert({
    ph: 7,
    tds: 100,
    turbidity: 50,
    temperature: 25,
  });

  assert.equal(alarm.active, false);
  assert.equal(alarm.severity, 'NORMAL');
});
