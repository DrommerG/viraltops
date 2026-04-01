/**
 * AGENTE: CHANNEL FILTER AGENT
 * Experto en identificar y filtrar mega-canales.
 * Excluye canales con 30M+ suscriptores y blocklist de conocidos.
 */
require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.YOUTUBE_API_KEY;

const SUBSCRIBER_THRESHOLD = 30_000_000; // 30 millones

// Mega-canales conocidos que siempre dominan el top
const BLOCKED_NAMES = [
  // English mega-channels
  'mrbeast', 'beast philanthropy', 'mrbeast gaming', 'mrbeast reacts', 'mr beast',
  'pewdiepie',
  'markiplier',
  'jacksepticeye',
  'dude perfect',
  'cocomelon',
  't-series',
  'like nastya',
  'vlad and niki',
  'kids diana show',
  'pinkfong',
  "ryan's world", 'ryan world',
  'set india',
  // Spanish mega-channels
  'elrubius', 'rubius', 'rubiusomg',
  'fede vigevani',
  'mikecrack',
  'vegetta777',
  'willyrex',
  'thegrefg', 'grefg',
  'auronplay',
  'juegagerman', 'juega german',
  'luisito comunica',
  'badabun',
  'yolo aventuras',
  'kenia os',
  'dosogas',
  'werevertumorro',
  'alex montrey',
  'alfredo larin',
  'ricky limon',
  'mau mcmahon',
  'karla bustillos',
  // Music labels
  'zee music',
  'sony music',
  'universal music',
  'vevo',
  'nastya',
];

function isBlockedByName(channelTitle) {
  const lower = (channelTitle || '').toLowerCase();
  return BLOCKED_NAMES.some(name => lower.includes(name));
}

async function fetchChannelSubscribers(channelIds) {
  const results = new Map();
  if (!channelIds || channelIds.length === 0) return results;

  for (let i = 0; i < channelIds.length; i += 50) {
    const chunk = channelIds.slice(i, i + 50);
    try {
      const res = await axios.get(`${BASE_URL}/channels`, {
        params: { key: API_KEY, part: 'statistics', id: chunk.join(',') }
      });
      for (const ch of (res.data.items || [])) {
        results.set(ch.id, parseInt(ch.statistics?.subscriberCount || 0));
      }
    } catch (err) {
      console.error('[ChannelFilter] Error consultando canales:', err.message);
    }
  }
  return results;
}

async function filterMegaChannels(videos) {
  if (!videos || videos.length === 0) return [];

  // Paso 1: filtro rápido por nombre
  const nameFiltered = videos.filter(v => {
    if (isBlockedByName(v.channelTitle)) {
      console.log(`[ChannelFilter] ❌ Bloqueado por nombre: "${v.channelTitle}"`);
      return false;
    }
    return true;
  });
  console.log(`[ChannelFilter] Filtro nombre: ${videos.length} → ${nameFiltered.length}`);

  if (nameFiltered.length === 0) return [];

  // Paso 2: filtro por suscriptores vía API
  const uniqueChannelIds = [...new Set(nameFiltered.map(v => v.channelId).filter(Boolean))];
  console.log(`[ChannelFilter] Consultando suscriptores de ${uniqueChannelIds.length} canales...`);
  const subscriberMap = await fetchChannelSubscribers(uniqueChannelIds);

  const filtered = nameFiltered.filter(v => {
    const subs = subscriberMap.get(v.channelId);
    if (subs === undefined) return true;
    if (subs >= SUBSCRIBER_THRESHOLD) {
      console.log(`[ChannelFilter] ❌ +30M subs: "${v.channelTitle}" (${(subs / 1e6).toFixed(1)}M)`);
      return false;
    }
    return true;
  });

  console.log(`[ChannelFilter] Filtro suscriptores: ${nameFiltered.length} → ${filtered.length}`);
  return filtered;
}

module.exports = { filterMegaChannels };
