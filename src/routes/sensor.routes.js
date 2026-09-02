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