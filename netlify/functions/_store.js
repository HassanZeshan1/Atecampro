const { getStore } = require('@netlify/blobs');

function store() {
  return getStore({
    name: 'license-keys',
    siteID: process.env.BLOBS_SITE_ID,
    token: process.env.BLOBS_TOKEN,
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = { store, todayKey };
