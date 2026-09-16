const { resellerStore } = require('./_reseller_store');

function randomResellerId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `RS-${part()}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const auth = event.headers['x-admin-secret'];
  if (!auth || auth !== process.env.ADMIN_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) {}

  const label = (body.label || '').toString().slice(0, 80);
  const secret = (body.secret || '').toString().trim();
  if (!secret) {
    return { statusCode: 400, body: JSON.stringify({ error: 'secret is required' }) };
  }

  const id = randomResellerId();
  const record = { id, label, secret, blocked: false, createdAt: Date.now() };

  const db = resellerStore();
  await db.setJSON(id, record);

  return { statusCode: 200, body: JSON.stringify({ ok: true, id, label }) };
};
