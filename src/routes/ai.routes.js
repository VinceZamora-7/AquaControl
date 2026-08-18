const express = require('express');

const {
  analyzeLatestReading,
} = require('../controllers/ai.controller');

const router = express.Router();

router.post(
  '/analyze',
  analyzeLatestReading
);

module.exports = router;