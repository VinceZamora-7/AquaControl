const pool = require('../config/database');
const {
  isExpoPushToken,
} = require('../services/push-notification.service');

async function registerPushToken(req, res) {
  try {
    const { deviceId } = req.params;
    const { token, platform } = req.body;

    if (!isExpoPushToken(token)) {
      return res.status(400).json({
        message: 'A valid Expo push token is required.',
      });
    }

    if (!['android', 'ios'].includes(platform)) {
      return res.status(400).json({
        message: 'platform must be android or ios.',
      });
    }

    const [devices] = await pool.execute(
      `SELECT id FROM devices WHERE device_code = ? LIMIT 1`,
      [deviceId]
    );

    if (devices.length === 0) {
      return res.status(404).json({
        message: 'Device not registered.',
      });
    }

    await pool.execute(
      `
      INSERT INTO push_tokens (
        device_id,
        expo_push_token,
        platform,
        is_active,
        last_registered_at
      )
      VALUES (?, ?, ?, TRUE, NOW())
      ON DUPLICATE KEY UPDATE
        device_id = VALUES(device_id),
        platform = VALUES(platform),
        is_active = TRUE,
        last_registered_at = NOW()
      `,
      [devices[0].id, token, platform]
    );

    return res.status(201).json({
      message: 'Push token registered.',
    });
  } catch (error) {
    console.error('registerPushToken error:', error);
    return res.status(500).json({
      message: 'Unable to register push notifications.',
    });
  }
}

async function unregisterPushToken(req, res) {
  try {
    const { token } = req.body;

    if (!isExpoPushToken(token)) {
      return res.status(400).json({
        message: 'A valid Expo push token is required.',
      });
    }

    await pool.execute(
      `
      UPDATE push_tokens
      SET is_active = FALSE
      WHERE expo_push_token = ?
      `,
      [token]
    );

    return res.json({
      message: 'Push token unregistered.',
    });
  } catch (error) {
    console.error('unregisterPushToken error:', error);
    return res.status(500).json({
      message: 'Unable to unregister push notifications.',
    });
  }
}

module.exports = {
  registerPushToken,
  unregisterPushToken,
};
