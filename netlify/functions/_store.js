const { getStore } = require('@netlify/blobs');

function store() {
  return getStore('license-keys');
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = { store, todayKey };
