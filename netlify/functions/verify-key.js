const { store, todayKey } = require('./_store');

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
      { headers: { 'User-Agent': 'KeyGateLicenseSystem/1.0' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const country = addr.country || '';
    return [city, country].filter(Boolean).join(', ') || 'Unknown location';
  } catch (e) {
    return 'Unknown location';
  }
}

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
  const rawLocation = body.location && typeof body.location === 'object'
    ? { lat: Number(body.location.lat), lng: Number(body.location.lng) }
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

  if (!record.devices) {
    record.devices = (record.deviceIds || []).map(id => ({
      id, model: 'Unknown (old data)', firstSeen: record.createdAt || Date.now(), location: null,
    }));
  }

  if (deviceId) {
    const maxDevices = record.maxDevices || 1;
    const existing = record.devices.find(d => d.id === deviceId);

    let locationData = null;
    if (rawLocation) {
      const address = await reverseGeocode(rawLocation.lat, rawLocation.lng);
      locationData = { lat: rawLocation.lat, lng: rawLocation.lng, address, at: Date.now() };
    }

    if (!existing) {
      if (record.devices.length >= maxDevices) {
        record.flagged = true;
        record.extraDeviceAttempt = { deviceId, deviceModel, at: Date.now() };
        await db.setJSON(key, record);
        return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'device_limit_reached' }) };
      }
      record.devices.push({ id: deviceId, model: deviceModel, firstSeen: Date.now(), location: locationData });
    } else {
      existing.model = deviceModel;
      existing.lastSeen = Date.now();
      if (locationData) existing.location = locationData;
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
