const { store, todayKey } = require('./_store');
const { authenticateReseller } = require('./_reseller_store');

exports.handler = async (event) => {
  const reseller = await authenticateReseller(event);
  if (!reseller) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

  const db = store();
  const { blobs } = await db.list();
  const today = todayKey();

  const keys = await Promise.all(
    blobs.map(async (b) => {
      const record = await db.get(b.key, { type: 'json' });
      if (!record || record.resellerId !== reseller.id) return null;
      const usedToday = record.usage?.[today]?.secondsUsed || 0;
      return {
        key: record.key, label: record.label || '', blocked: record.blocked,
        dailyLimitSeconds: record.dailyLimitSeconds, usedTodaySeconds: usedToday,
        remainingTodaySeconds: Math.max(0, record.dailyLimitSeconds - usedToday),
        createdAt: record.createdAt, maxDevices: record.maxDevices || 1,
        deviceCount: (record.deviceIds || []).length, flagged: !!record.flagged,
      };
    })
  );

  return { statusCode: 200, body: JSON.stringify({ ok: true, keys: keys.filter(Boolean) }) };
};
