const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '..', 'public', 'data', 'cache.json');
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

// In-memory cache — primary store (survives Render sleep/wake cycles)
let memoryCache = null;

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch {}

function loadCache() {
  // Memory is primary
  if (memoryCache && memoryCache.weekKey) return memoryCache;

  // File as fallback
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      memoryCache = parsed;
      return parsed;
    }
  } catch {}

  return {};
}

function saveCache(data) {
  memoryCache = data;
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    // Ephemeral filesystem (Render free tier) — memory cache still works
    console.warn('[Cache] Could not write to file (ephemeral fs):', e.message);
  }
}

// Returns the Monday of the current week (UTC)
function getCurrentWeekKey() {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  return monday.toISOString().split('T')[0];
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
  nextMonday.setUTCHours(6, 0, 0, 0);
  return nextMonday.toISOString();
}

module.exports = { loadCache, saveCache, getCurrentWeekKey, isStale, getNextRefreshDate };
