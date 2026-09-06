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
  if (!key) {
    return { statusCode: 400, body: JSON.stringify({ error: 'key is required' }) };
  }

  const db = store();
  await db.delete(key);

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, key, deleted: true }),
  };
};
