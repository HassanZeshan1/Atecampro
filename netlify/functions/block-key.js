const { store } = require('./_store');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const auth = event.headers['x-admin-secret'];
  if (!auth || auth !== process.env.ADMIN_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {}

  const key = (body.key || '').toString().trim().toUpperCase();
  const blocked = body.blocked !== false;

  if (!key) {
    return { statusCode: 400, body: JSON.stringify({ error: 'key is required' }) };
  }

  const db = store();
  const record = await db.get(key, { type: 'json' });

  if (!record) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Key not found' }) };
  }

  record.blocked = blocked;
  await db.setJSON(key, record);

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, key, blocked: record.blocked }),
  };
};
