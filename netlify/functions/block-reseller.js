const { resellerStore } = require('./_reseller_store');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const auth = event.headers['x-admin-secret'];
  if (!auth || auth !== process.env.ADMIN_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) {}

  const id = (body.id || '').toString().trim();
  const blocked = body.blocked !== false;

  const db = resellerStore();
  const record = await db.get(id, { type: 'json' });
  if (!record) return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };

  record.blocked = blocked;
  await db.setJSON(id, record);

  return { statusCode: 200, body: JSON.stringify({ ok: true, id, blocked }) };
};
