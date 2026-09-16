const { resellerStore } = require('./_reseller_store');

exports.handler = async (event) => {
  const auth = event.headers['x-admin-secret'];
  if (!auth || auth !== process.env.ADMIN_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const db = resellerStore();
  const { blobs } = await db.list();

  const resellers = await Promise.all(
    blobs.map(async (b) => {
      const r = await db.get(b.key, { type: 'json' });
      if (!r) return null;
      return { id: r.id, label: r.label, blocked: r.blocked, createdAt: r.createdAt };
    })
  );

  return { statusCode: 200, body: JSON.stringify({ ok: true, resellers: resellers.filter(Boolean) }) };
};
