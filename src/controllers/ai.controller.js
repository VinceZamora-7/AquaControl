const pool = require('../config/database');

const {
  analyzeWaterQuality,
} = require('../services/gemini.service');

async function analyzeLatestReading(req, res) {
  try {
    const {
      device_id,
      question,
    } = req.body;

    if (!device_id) {
      return res.status(400).json({
        message: 'device_id is required.',
      });
    }

    const [rows] = await pool.execute(
      `
      SELECT
        d.device_code,
        sr.ph,
        sr.tds,
        sr.turbidity,
        sr.temperature,
        sr.water_status,
        sr.created_at
      FROM sensor_readings sr
      INNER JOIN devices d
        ON d.id = sr.device_id
      WHERE d.device_code = ?
      ORDER BY sr.created_at DESC
      LIMIT 1
      `,
      [device_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'No sensor readings found for this device.',
      });
    }

    const reading = rows[0];

    const analysis = await analyzeWaterQuality({
      deviceId: reading.device_code,

      ph: Number(reading.ph),

      tds: Number(reading.tds),

      turbidity: Number(
        reading.turbidity
      ),

      temperature: Number(
        reading.temperature
      ),

      status: reading.water_status,

      question,
    });

    return res.json({
      deviceId: reading.device_code,

      reading: {
        ph: Number(reading.ph),
        tds: Number(reading.tds),

        ntu: Number(
          reading.turbidity
        ),

        temp: Number(
          reading.temperature
        ),

        status:
          reading.water_status,

        timestamp:
          reading.created_at,
      },

      analysis,
    });
  } catch (error) {
    console.error(
      'Gemini analysis error:',
      error
    );

    return res.status(500).json({
      message:
        'Unable to analyze water quality at this time.',
    });
  }
}

module.exports = {
  analyzeLatestReading,
};