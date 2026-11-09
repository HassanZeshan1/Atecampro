const bcrypt = require('bcryptjs');
const { getStore } = require('@netlify/blobs');

function resellerStore() {
  return getStore({
    name: 'resellers',
    siteID: process.env.BLOBS_SITE_ID,
    token: process.env.BLOBS_TOKEN,
  });
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

async function authenticateReseller(event) {
  const id = event.headers['x-reseller-id'];
  const secret = event.headers['x-reseller-secret'];
  if (!id || !secret) return { error: 'missing_credentials' };

  const db = resellerStore();
  const record = await db.get(id, { type: 'json' });
  if (!record) return { error: 'invalid_credentials' };
  if (record.blocked) return { error: 'blocked' };

  const now = Date.now();
  if (record.lockedUntil && now < record.lockedUntil) {
    return { error: 'too_many_attempts' };
  }

  const valid = record.secretHash
    ? await bcrypt.compare(secret, record.secretHash)
    : secret === record.secret;

  if (!valid) {
    record.failedAttempts = (record.failedAttempts || 0) + 1;
    if (record.failedAttempts >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS;
      record.failedAttempts = 0;
    }
    await db.setJSON(id, record);
    return { error: 'invalid_credentials' };
  }

  if (record.failedAttempts || record.lockedUntil) {
    record.failedAttempts = 0;
    record.lockedUntil = 0;
    await db.setJSON(id, record);
  }

  return { record };
}

module.exports = { resellerStore, authenticateReseller };
