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

  // Key nahi mili
  if (!record) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, reason: 'invalid_key' }) };
  }
  
  // Key Blocked hai
  if (record.blocked) {
    return { statusCode: 403, body: JSON.stringify({ ok: false, reason: 'blocked' }) };
  }

  const today = todayKey();
  const usageToday = record.usage[today] || { secondsUsed: 0, lastHeartbeat: null };
  const remaining = record.dailyLimitSeconds - usageToday.secondsUsed;

  // Daily limit over
  if (remaining <= 0) {
    return { statusCode: 403, body: JSON.stringify({ ok: false, reason: 'daily_limit_reached' }) };
  }

  usageToday.lastHeartbeat = Date.now();
  record.usage[today] = usageToday;
  await db.setJSON(key, record);

  return {
    statusCode: 200,
    body: JSON.stringify({ 
      ok: true, 
      remainingSeconds: remaining, 
      dailyLimitSeconds: record.dailyLimitSeconds 
    }),
  };
};
