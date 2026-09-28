const lastAlerts = new Map();

function getCooldownMs() {
  const seconds = Number(
    process.env.ALERT_NOTIFICATION_COOLDOWN_SECONDS
  );

  return (
    Number.isFinite(seconds) && seconds >= 0
      ? seconds
      : 300
  ) * 1000;
}

function createDiscrepancyNotification(
  deviceCode,
  readingId,
  alarm,
  timestamp
) {
  if (!alarm.active) {
    lastAlerts.delete(deviceCode);
    return null;
  }

  const previous = lastAlerts.get(deviceCode);
  const now = Date.now();
  const shouldNotify =
    !previous ||
    previous.severity !== alarm.severity ||
    now - previous.sentAt >= getCooldownMs();

  if (!shouldNotify) {
    return null;
  }

  lastAlerts.set(deviceCode, {
    severity: alarm.severity,
    sentAt: now,
  });

  return {
    type: 'WATER_QUALITY_DISCREPANCY',
    title: `${alarm.severity} water quality alert`,
    message: alarm.reason,
    deviceId: deviceCode,
    readingId,
    severity: alarm.severity,
    reasons: alarm.reasons,
    timestamp,
  };
}

module.exports = {
  createDiscrepancyNotification,
};
