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

  const today = todayKey();
  const usageToday = record.usage[today] || { secondsUsed: 0, lastHeartbeat: Date.now() };

  const now = Date.now();
  const lastBeat = usageToday.lastHeartbeat || now;
  const elapsedSeconds = Math.min(60, Math.max(0, (now - lastBeat) / 1000));

  usageToday.secondsUsed = (usageToday.secondsUsed || 0) + elapsedSeconds;
  usageToday.lastHeartbeat = now;
  record.usage[today] = usageToday;

  const remaining = record.dailyLimitSeconds - usageToday.secondsUsed;

  if (remaining <= 0) {
    await db.setJSON(key, record);
    return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'daily_limit_reached' }) };
  }

  await db.setJSON(key, record);

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, remainingSeconds: Math.round(remaining) }),
  };
};
