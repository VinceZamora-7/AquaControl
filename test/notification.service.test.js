const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createDiscrepancyNotification,
} = require('../src/services/notification.service');

const {
  isExpoPushToken,
} = require('../src/services/push-notification.service');

test('creates an alert and suppresses an immediate duplicate', () => {
  const alarm = {
    active: true,
    severity: 'CAUTION',
    reason: 'Turbidity is elevated.',
    reasons: ['Turbidity is elevated.'],
  };

  const first = createDiscrepancyNotification(
    'notification-test-device',
    1,
    alarm,
    '2026-01-01T00:00:00.000Z'
  );
  const duplicate = createDiscrepancyNotification(
    'notification-test-device',
    2,
    alarm,
    '2026-01-01T00:00:01.000Z'
  );

  assert.equal(
    first.type,
    'WATER_QUALITY_DISCREPANCY'
  );
  assert.equal(duplicate, null);
});

test('a normal reading resets notification suppression', () => {
  const device = 'notification-reset-device';
  const alarm = {
    active: true,
    severity: 'CRITICAL',
    reason: 'Critical discrepancy.',
    reasons: ['Critical discrepancy.'],
  };

  createDiscrepancyNotification(
    device,
    1,
    alarm,
    '2026-01-01T00:00:00.000Z'
  );
  createDiscrepancyNotification(
    device,
    2,
    { active: false },
    '2026-01-01T00:00:01.000Z'
  );
  const next = createDiscrepancyNotification(
    device,
    3,
    alarm,
    '2026-01-01T00:00:02.000Z'
  );

  assert.notEqual(next, null);
});

test('validates Expo push token formats', () => {
  assert.equal(
    isExpoPushToken('ExpoPushToken[abc_123-XYZ]'),
    true
  );
  assert.equal(
    isExpoPushToken('ExponentPushToken[abc123]'),
    true
  );
  assert.equal(isExpoPushToken('not-a-token'), false);
});
