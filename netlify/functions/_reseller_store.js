const { getStore } = require('@netlify/blobs');

function resellerStore() {
  return getStore({
    name: 'resellers',
    siteID: process.env.BLOBS_SITE_ID,
    token: process.env.BLOBS_TOKEN,
  });
}

async function authenticateReseller(event) {
  const id = event.headers['x-reseller-id'];
  const secret = event.headers['x-reseller-secret'];
  if (!id || !secret) return null;
  const db = resellerStore();
  const record = await db.get(id, { type: 'json' });
  if (!record || record.blocked) return null;
  if (record.secret !== secret) return null;
  return record;
}

module.exports = { resellerStore, authenticateReseller };
