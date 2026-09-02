const pool =
  require('../config/database');

const {
  emitSensorReading,
} = require('../services/socket.service');

const {
  evaluateWaterAlert,
} = require('../services/alert.service');

const {
  getThresholdsByDeviceId,
} = require('../services/threshold.service');

// ============================================================
// SUBMIT SENSOR READING
// ============================================================

async function submitReading(
  req,
  res
) {
  try {
    const {
      device_id,
      ph,
      tds,
      turbidity,
      temperature,
      status,
    } = req.body;

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!device_id) {
      return res
        .status(400)
        .json({
          message:
            'device_id is required.',
        });
    }

    // --------------------------------------------------------
    // CHECK DEVICE
    // --------------------------------------------------------

    const [devices] =
      await pool.execute(
        `
        SELECT
          id,
          device_code
        FROM devices
        WHERE device_code = ?
        LIMIT 1
        `,
        [device_id]
      );

    if (
      devices.length === 0
    ) {
      return res
        .status(404)
        .json({
          message:
            'Device not registered.',
        });
    }

    const device =
      devices[0];

    // --------------------------------------------------------
    // NORMALIZE SENSOR VALUES
    // --------------------------------------------------------

    const normalizedPh =
      ph !== null &&
      ph !== undefined
        ? Number(ph)
        : null;

    const normalizedTds =
      tds !== null &&
      tds !== undefined
        ? Number(tds)
        : null;

    const normalizedTurbidity =
      turbidity !== null &&
      turbidity !== undefined
        ? Number(turbidity)
        : null;

    const normalizedTemperature =
      temperature !== null &&
      temperature !== undefined
        ? Number(temperature)
        : null;

    // --------------------------------------------------------
    // LOAD CURRENT DEVICE THRESHOLDS
    // --------------------------------------------------------

    const thresholds =
      await getThresholdsByDeviceId(
        device.id
      );

    // --------------------------------------------------------
    // EVALUATE AQUACONTROL ALERT
    // --------------------------------------------------------

    const alarm =
      evaluateWaterAlert(
        {
          ph: normalizedPh,

          tds:
            normalizedTds,

          turbidity:
            normalizedTurbidity,

          temperature:
            normalizedTemperature,
        },
        thresholds
      );

    // --------------------------------------------------------
    // SAVE SENSOR READING
    // --------------------------------------------------------

    const [result] =
      await pool.execute(
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

          normalizedPh,

          normalizedTds,

          normalizedTurbidity,

          normalizedTemperature,

          status ?? null,
        ]
      );

    // --------------------------------------------------------
    // UPDATE DEVICE STATUS
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // NORMALIZED READING
    // --------------------------------------------------------

    const reading = {
      id:
        result.insertId,

      deviceId:
        device.device_code,

      ph:
        normalizedPh,

      tds:
        normalizedTds,

      ntu:
        normalizedTurbidity,

      temp:
        normalizedTemperature,

      status:
        status ?? null,

      alarm,

      timestamp:
        new Date().toISOString(),
    };

    // --------------------------------------------------------
    // SOCKET.IO LIVE UPDATE
    // --------------------------------------------------------

    emitSensorReading(
      device.device_code,
      reading
    );

    // --------------------------------------------------------
    // RESPONSE TO ESP32
    // --------------------------------------------------------

    return res
      .status(201)
      .json({
        message:
          'Sensor reading received.',

        data:
          reading,

        alarm,
      });
  } catch (error) {
    console.error(
      'submitReading error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Internal server error.',
      });
  }
}

// ============================================================
// GET LATEST READING
// ============================================================

async function getLatestReading(
  req,
  res
) {
  try {
    const {
      deviceId,
    } = req.params;

    const [rows] =
      await pool.execute(
        `
        SELECT
          sr.id,

          d.id AS internal_device_id,

          d.device_code,

          sr.ph,
          sr.tds,
          sr.turbidity,
          sr.temperature,
          sr.water_status,
          sr.created_at

        FROM sensor_readings sr

        INNER JOIN devices d
          ON d.id =
             sr.device_id

        WHERE d.device_code = ?

        ORDER BY
          sr.created_at DESC

        LIMIT 1
        `,
        [deviceId]
      );

    if (
      rows.length === 0
    ) {
      return res
        .status(404)
        .json({
          message:
            'No sensor reading found.',
        });
    }

    const row =
      rows[0];

    const ph =
      row.ph !== null
        ? Number(row.ph)
        : null;

    const tds =
      row.tds !== null
        ? Number(row.tds)
        : null;

    const ntu =
      row.turbidity !== null
        ? Number(
            row.turbidity
          )
        : null;

    const temp =
      row.temperature !==
      null
        ? Number(
            row.temperature
          )
        : null;

    const thresholds =
      await getThresholdsByDeviceId(
        row.internal_device_id
      );

    const alarm =
      evaluateWaterAlert(
        {
          ph,
          tds,

          turbidity:
            ntu,

          temperature:
            temp,
        },
        thresholds
      );

    return res.json({
      id:
        row.id,

      ph,

      tds,

      ntu,

      temp,

      status:
        row.water_status,

      deviceId:
        row.device_code,

      alarm,

      timestamp:
        row.created_at,
    });
  } catch (error) {
    console.error(
      'getLatestReading error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Internal server error.',
      });
  }
}

// ============================================================
// GET READING HISTORY
// ============================================================

async function getReadingHistory(
  req,
  res
) {
  try {
    const {
      deviceId,
    } = req.params;

    const requestedLimit =
      Number(
        req.query.limit ||
          100
      );

    const limit =
      Math.min(
        Math.max(
          Number.isFinite(
            requestedLimit
          )
            ? requestedLimit
            : 100,

          1
        ),

        500
      );

    const [rows] =
      await pool.execute(
        `
        SELECT
          sr.id,

          d.id AS internal_device_id,

          d.device_code,

          sr.ph,
          sr.tds,
          sr.turbidity,
          sr.temperature,
          sr.water_status,
          sr.created_at

        FROM sensor_readings sr

        INNER JOIN devices d
          ON d.id =
             sr.device_id

        WHERE d.device_code = ?

        ORDER BY
          sr.created_at DESC

        LIMIT ?
        `,
        [
          deviceId,
          limit,
        ]
      );

    if (
      rows.length === 0
    ) {
      return res.json({
        deviceId,

        count: 0,

        data: [],
      });
    }

    const thresholds =
      await getThresholdsByDeviceId(
        rows[0]
          .internal_device_id
      );

    const readings =
      rows.map(
        (row) => {
          const ph =
            row.ph !== null
              ? Number(
                  row.ph
                )
              : null;

          const tds =
            row.tds !== null
              ? Number(
                  row.tds
                )
              : null;

          const ntu =
            row.turbidity !==
            null
              ? Number(
                  row.turbidity
                )
              : null;

          const temp =
            row.temperature !==
            null
              ? Number(
                  row.temperature
                )
              : null;

          const alarm =
            evaluateWaterAlert(
              {
                ph,

                tds,

                turbidity:
                  ntu,

                temperature:
                  temp,
              },

              thresholds
            );

          return {
            id:
              row.id,

            deviceId:
              row.device_code,

            ph,

            tds,

            ntu,

            temp,

            status:
              row.water_status,

            alarm,

            timestamp:
              row.created_at,
          };
        }
      );

    return res.json({
      deviceId,

      count:
        readings.length,

      data:
        readings,
    });
  } catch (error) {
    console.error(
      'getReadingHistory error:',
      error
    );

    return res
      .status(500)
      .json({
        message:
          'Internal server error.',
      });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  submitReading,
  getLatestReading,
  getReadingHistory,
};