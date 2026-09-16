const { store } = require('./_store');
const { authenticateReseller } = require('./_reseller_store');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const reseller = await authenticateReseller(event);
  if (!reseller) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) {}

  const key = (body.key || '').toString().trim().toUpperCase();
  const db = store();
  const record = await db.get(key, { type: 'json' });
  if (!record || record.resellerId !== reseller.id) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Key not found' }) };
  }

  await db.delete(key);
  return { statusCode: 200, body: JSON.stringify({ ok: true, key, deleted: true }) };
};
