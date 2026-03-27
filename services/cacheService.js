const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '..', 'public', 'data', 'cache.json');
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveCache(data) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Returns the Monday of the current week (UTC)
function getCurrentWeekKey() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  return monday.toISOString().split('T')[0]; // e.g. "2026-03-30"
}

function isStale() {
  const cache = loadCache();
  if (!cache.weekKey) return true;
  return cache.weekKey !== getCurrentWeekKey();
}

function getNextRefreshDate() {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(now);
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  return nextMonday.toISOString();
}

module.exports = { loadCache, saveCache, getCurrentWeekKey, isStale, getNextRefreshDate };
