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
  const db = resellerStore();
  await db.delete(id);

  return { statusCode: 200, body: JSON.stringify({ ok: true, id, deleted: true }) };
};
