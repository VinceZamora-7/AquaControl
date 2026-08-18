const pool = require('../config/database');
const {
  emitSensorReading,
} = require('../services/socket.service');

async function submitReading(req, res) {
  try {
    const {
      device_id,
      ph,
      tds,
      turbidity,
      temperature,
      status,
    } = req.body;

    if (!device_id) {
      return res.status(400).json({
        message: 'device_id is required.',
      });
    }

    const [devices] = await pool.execute(
      `
      SELECT id, device_code
      FROM devices
      WHERE device_code = ?
      LIMIT 1
      `,
      [device_id]
    );

    if (devices.length === 0) {
      return res.status(404).json({
        message: 'Device not registered.',
      });
    }

    const device = devices[0];

    const [result] = await pool.execute(
      `
      INSERT INTO sensor_readings (
        device_id,
        ph,
        tds,
        turbidity,
        temperature,
        water_status
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        device.id,
        ph ?? null,
        tds ?? null,
        turbidity ?? null,
        temperature ?? null,
        status ?? null,
      ]
    );

    await pool.execute(
      `
      UPDATE devices
      SET
        last_seen = NOW(),
        is_online = TRUE
      WHERE id = ?
      `,
      [device.id]
    );

    const reading = {
      id: result.insertId,
      deviceId: device.device_code,
      ph,
      tds,
      ntu: turbidity,
      temp: temperature,
      status,
      timestamp: new Date().toISOString(),
    };

    emitSensorReading(
      device.device_code,
      reading
    );

    return res.status(201).json({
      message: 'Sensor reading received.',
      data: reading,
    });
  } catch (error) {
    console.error('submitReading error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
}

async function getLatestReading(req, res) {
  try {
    const { deviceId } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT
        sr.id,
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
      [deviceId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'No sensor reading found.',
      });
    }

    const row = rows[0];

    return res.json({
      ph: Number(row.ph),
      tds: Number(row.tds),
      ntu: Number(row.turbidity),
      temp: Number(row.temperature),
      status: row.water_status,
      deviceId: row.device_code,
      timestamp: row.created_at,
    });
  } catch (error) {
    console.error(
      'getLatestReading error:',
      error
    );

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
}

async function getReadingHistory(req, res) {
  try {
    const { deviceId } = req.params;

    const limit = Math.min(
      Number(req.query.limit || 100),
      500
    );

    const [rows] = await pool.execute(
      `
      SELECT
        sr.id,
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
      LIMIT ?
      `,
      [
        deviceId,
        limit,
      ]
    );

    const readings = rows.map((row) => ({
      id: row.id,
      deviceId: row.device_code,
      ph: Number(row.ph),
      tds: Number(row.tds),
      ntu: Number(row.turbidity),
      temp: Number(row.temperature),
      status: row.water_status,
      timestamp: row.created_at,
    }));

    return res.json({
      deviceId,
      count: readings.length,
      data: readings,
    });
  } catch (error) {
    console.error(
      'getReadingHistory error:',
      error
    );

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
}

module.exports = {
  submitReading,
  getLatestReading,
  getReadingHistory,
};