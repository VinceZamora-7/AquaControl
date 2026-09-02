const pool = require('../config/database');

const DEFAULT_THRESHOLDS = {
  ph: {
    normalMin: 6.5,
    normalMax: 9.5,
    criticalMin: 6.0,
    criticalMax: 12.0,
  },

  tds: {
    caution: 500,
    critical: 800,
  },

  turbidity: {
    caution: 200,
    critical: 300,
  },

  temperature: {
    caution: 35,
    critical: 45,
  },
};

function normalizeThresholdRow(row) {
  if (!row) {
    return DEFAULT_THRESHOLDS;
  }

  return {
    ph: {
      normalMin: Number(row.ph_normal_min),
      normalMax: Number(row.ph_normal_max),
      criticalMin: Number(row.ph_critical_min),
      criticalMax: Number(row.ph_critical_max),
    },

    tds: {
      caution: Number(row.tds_caution),
      critical: Number(row.tds_critical),
    },

    turbidity: {
      caution: Number(
        row.turbidity_caution
      ),
      critical: Number(
        row.turbidity_critical
      ),
    },

    temperature: {
      caution: Number(
        row.temperature_caution
      ),
      critical: Number(
        row.temperature_critical
      ),
    },
  };
}

async function getThresholdsByDeviceId(
  deviceId
) {
  const [rows] = await pool.execute(
    `
    SELECT
      at.ph_normal_min,
      at.ph_normal_max,
      at.ph_critical_min,
      at.ph_critical_max,
      at.tds_caution,
      at.tds_critical,
      at.turbidity_caution,
      at.turbidity_critical,
      at.temperature_caution,
      at.temperature_critical
    FROM alert_thresholds at
    WHERE at.device_id = ?
    LIMIT 1
    `,
    [deviceId]
  );

  if (rows.length === 0) {
    return DEFAULT_THRESHOLDS;
  }

  return normalizeThresholdRow(
    rows[0]
  );
}

async function getThresholdsByDeviceCode(
  deviceCode
) {
  const [rows] = await pool.execute(
    `
    SELECT
      d.id AS device_id,

      at.ph_normal_min,
      at.ph_normal_max,
      at.ph_critical_min,
      at.ph_critical_max,
      at.tds_caution,
      at.tds_critical,
      at.turbidity_caution,
      at.turbidity_critical,
      at.temperature_caution,
      at.temperature_critical

    FROM devices d

    LEFT JOIN alert_thresholds at
      ON at.device_id = d.id

    WHERE d.device_code = ?

    LIMIT 1
    `,
    [deviceCode]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

  const hasStoredThresholds =
    row.ph_normal_min !== null &&
    row.ph_normal_min !== undefined;

  return {
    deviceId: row.device_id,

    thresholds:
      hasStoredThresholds
        ? normalizeThresholdRow(row)
        : DEFAULT_THRESHOLDS,
  };
}

async function saveThresholds(
  deviceId,
  thresholds
) {
  await pool.execute(
    `
    INSERT INTO alert_thresholds (
      device_id,

      ph_normal_min,
      ph_normal_max,
      ph_critical_min,
      ph_critical_max,

      tds_caution,
      tds_critical,

      turbidity_caution,
      turbidity_critical,

      temperature_caution,
      temperature_critical
    )

    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

    ON DUPLICATE KEY UPDATE
      ph_normal_min = VALUES(ph_normal_min),
      ph_normal_max = VALUES(ph_normal_max),
      ph_critical_min = VALUES(ph_critical_min),
      ph_critical_max = VALUES(ph_critical_max),

      tds_caution = VALUES(tds_caution),
      tds_critical = VALUES(tds_critical),

      turbidity_caution =
        VALUES(turbidity_caution),

      turbidity_critical =
        VALUES(turbidity_critical),

      temperature_caution =
        VALUES(temperature_caution),

      temperature_critical =
        VALUES(temperature_critical)
    `,
    [
      deviceId,

      thresholds.ph.normalMin,
      thresholds.ph.normalMax,
      thresholds.ph.criticalMin,
      thresholds.ph.criticalMax,

      thresholds.tds.caution,
      thresholds.tds.critical,

      thresholds.turbidity.caution,
      thresholds.turbidity.critical,

      thresholds.temperature.caution,
      thresholds.temperature.critical,
    ]
  );

  return thresholds;
}

module.exports = {
  DEFAULT_THRESHOLDS,
  getThresholdsByDeviceId,
  getThresholdsByDeviceCode,
  saveThresholds,
};