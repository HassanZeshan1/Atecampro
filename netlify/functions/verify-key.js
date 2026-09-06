const { store, todayKey } = require('./_store');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {}

  const key = (body.key || '').toString().trim().toUpperCase();
  const deviceId = (body.deviceId || '').toString().trim().slice(0, 128);

  if (!key) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, reason: 'Key required' }) };
  }

  const db = store();
  const record = await db.get(key, { type: 'json' });

  if (!record) {
    return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'invalid_key' }) };
  }
  if (record.blocked) {
    return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'blocked' }) };
  }

  // --- Device tracking ---
  if (deviceId) {
    if (!record.deviceIds) record.deviceIds = [];
    const maxDevices = record.maxDevices || 1;

    if (!record.deviceIds.includes(deviceId)) {
      if (record.deviceIds.length >= maxDevices) {
        // Extra device: allow through, but flag for admin
        record.flagged = true;
        record.extraDeviceAttempt = { deviceId, at: Date.now() };
      } else {
        record.deviceIds.push(deviceId);
      }
    }
  }

  const today = todayKey();
  const usageToday = record.usage[today] || { secondsUsed: 0, lastHeartbeat: null };
  const remaining = record.dailyLimitSeconds - usageToday.secondsUsed;

  if (remaining <= 0) {
    await db.setJSON(key, record); // save device tracking even if quota is over
    return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'daily_limit_reached' }) };
  }

  usageToday.lastHeartbeat = Date.now();
  record.usage[today] = usageToday;
  await db.setJSON(key, record);

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, remainingSeconds: remaining, dailyLimitSeconds: record.dailyLimitSeconds }),
  };
};
