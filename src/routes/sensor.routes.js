const express =
  require('express');

const deviceAuth =
  require('../middleware/deviceAuth');

const {
  submitReading,
  getLatestReading,
  getReadingHistory,
} = require('../controllers/sensor.controller');

const {
  getThresholds,
  updateThresholds,
  restoreDefaultThresholds,
} = require('../controllers/threshold.controller');

const {
  registerPushToken,
  unregisterPushToken,
} = require('../controllers/push-token.controller');

const router =
  express.Router();

// ==========================================
// SENSOR READINGS
// ==========================================

router.post(
  '/readings',
  deviceAuth,
  submitReading
);

router.get(
  '/devices/:deviceId/latest',
  getLatestReading
);

// ==========================================
// PUSH NOTIFICATIONS
// ==========================================

router.post(
  '/devices/:deviceId/push-tokens',
  registerPushToken
);

router.post(
  '/devices/:deviceId/push-tokens/unregister',
  unregisterPushToken
);

router.get(
  '/devices/:deviceId/readings',
  getReadingHistory
);

// ==========================================
// ALERT THRESHOLDS
// ==========================================

router.get(
  '/devices/:deviceId/thresholds',
  getThresholds
);

router.put(
  '/devices/:deviceId/thresholds',
  updateThresholds
);

router.post(
  '/devices/:deviceId/thresholds/reset',
  restoreDefaultThresholds
);

module.exports =
  router;
