const express = require('express');

const deviceAuth = require('../middleware/deviceAuth');

const {
  submitReading,
  getLatestReading,
  getReadingHistory,
} = require('../controllers/sensor.controller');

const router = express.Router();

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

module.exports = router;