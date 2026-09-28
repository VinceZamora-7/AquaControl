const pool = require('../config/database');

const EXPO_PUSH_URL =
  'https://exp.host/--/api/v2/push/send';
const MAX_BATCH_SIZE = 100;

function isExpoPushToken(token) {
  return (
    typeof token === 'string' &&
    /^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/.test(
      token
    )
  );
}

function chunk(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function deactivateTokens(tokens) {
  if (tokens.length === 0) {
    return;
  }

  const placeholders = tokens.map(() => '?').join(', ');

  await pool.execute(
    `
    UPDATE push_tokens
    SET is_active = FALSE
    WHERE expo_push_token IN (${placeholders})
    `,
    tokens
  );
}

async function sendBatch(tokens, notification) {
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    channelId: 'water-quality-alerts',
    priority: 'high',
    title: notification.title,
    body: notification.message,
    data: {
      type: notification.type,
      deviceId: notification.deviceId,
      readingId: notification.readingId,
      severity: notification.severity,
      timestamp: notification.timestamp,
    },
  }));

  const headers = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };

  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization =
      `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(
      `Expo Push API returned ${response.status}: ${await response.text()}`
    );
  }

  const result = await response.json();
  const tickets = Array.isArray(result.data)
    ? result.data
    : [result.data];
  const invalidTokens = [];

  tickets.forEach((ticket, index) => {
    if (
      ticket?.status === 'error' &&
      ticket?.details?.error === 'DeviceNotRegistered'
    ) {
      invalidTokens.push(tokens[index]);
    }
  });

  await deactivateTokens(invalidTokens);

  return tickets;
}

async function sendDiscrepancyPush(notification) {
  const [rows] = await pool.execute(
    `
    SELECT pt.expo_push_token
    FROM push_tokens pt
    INNER JOIN devices d ON d.id = pt.device_id
    WHERE d.device_code = ?
      AND pt.is_active = TRUE
    `,
    [notification.deviceId]
  );

  const tokens = rows
    .map((row) => row.expo_push_token)
    .filter(isExpoPushToken);

  if (tokens.length === 0) {
    return { sent: 0 };
  }

  let sent = 0;

  for (const tokenBatch of chunk(tokens, MAX_BATCH_SIZE)) {
    await sendBatch(tokenBatch, notification);
    sent += tokenBatch.length;
  }

  return { sent };
}

module.exports = {
  isExpoPushToken,
  sendDiscrepancyPush,
};
