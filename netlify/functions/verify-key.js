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
  const deviceModel = (body.deviceModel || 'Unknown device').toString().trim().slice(0, 80);
  const location = body.location && typeof body.location === 'object'
    ? { lat: Number(body.location.lat), lng: Number(body.location.lng), at: Date.now() }
    : null;

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

  if (deviceId) {
    if (!record.devices) record.devices = [];
    const maxDevices = record.maxDevices || 1;
    const existing = record.devices.find(d => d.id === deviceId);

    if (!existing) {
      if (record.devices.length >= maxDevices) {
        record.flagged = true;
        record.extraDeviceAttempt = { deviceId, deviceModel, at: Date.now() };
      } else {
        record.devices.push({ id: deviceId, model: deviceModel, firstSeen: Date.now(), location });
      }
    } else {
      existing.model = deviceModel;
      existing.lastSeen = Date.now();
      if (location) existing.location = location;
    }
  }

  const today = todayKey();
  const usageToday = record.usage[today] || { secondsUsed: 0, lastHeartbeat: null };
  const remaining = record.dailyLimitSeconds - usageToday.secondsUsed;

  if (remaining <= 0) {
    await db.setJSON(key, record);
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
