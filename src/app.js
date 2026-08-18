const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const sensorRoutes = require('./routes/sensor.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();

app.use(helmet());

app.use(cors());

app.use(express.json({
  limit: '100kb',
}));

app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'water-quality-backend',
    timestamp: new Date().toISOString(),
  });
});

app.use(
  '/api/v1',
  sensorRoutes
);

app.use(
  '/api/v1/ai',
  aiRoutes
);

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found.',
  });
});

module.exports = app;