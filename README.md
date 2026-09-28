# AquaControl Backend

Express/MySQL API for AquaControl sensor ingestion, history, thresholds,
real-time readings, discrepancy alerts, and AI-assisted interpretation.

## API overview

- `POST /api/v1/readings` — authenticated device ingestion.
- `GET /api/v1/devices/:deviceId/latest` — latest raw reading and alert.
- `GET /api/v1/devices/:deviceId/readings?limit=100` — reading history.
- `GET|PUT /api/v1/devices/:deviceId/thresholds` — alert thresholds.
- `POST /api/v1/ai/analyze` — interpretation with explicit laboratory and
  microbial testing recommendations.
- `POST /api/v1/devices/:deviceId/push-tokens` — register an Expo push token.

## Reading stability

Raw readings remain unchanged in MySQL. Ingestion responses and the
`sensor:reading` Socket.IO event also include a `stability` object containing
a rolling-median view. It becomes ready after five readings by default. Set
`READING_STABILITY_WINDOW` to an integer from 1 to 20 to adjust the window.
Because this buffer is in memory, it warms up again after a VPS restart.

## Discrepancy notifications

Clients subscribed to `device:<deviceId>` receive a `water:discrepancy`
Socket.IO event for caution or critical readings. Repeated alerts are limited
to one every 300 seconds per device and severity; configure this with
`ALERT_NOTIFICATION_COOLDOWN_SECONDS`. A normal reading resets the alert.

Live clients receive the Socket.IO event. Registered development and production
builds also receive background notifications through Expo Push Service. Apply
`migrations/001_create_push_tokens.sql` to the MySQL database before deploying
this version. Set `EXPO_ACCESS_TOKEN` when enhanced push security is enabled for
the Expo project.

## Verification

Run `npm test` before deployment. The application requires the database and
environment variables documented by the deployment environment; secrets must
remain in `.env` and must not be committed.
