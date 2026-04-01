require('dotenv').config();
const axios = require('axios');
const { getStrategy, getAllStrategies } = require('../agents/categoryResearcher');

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.YOUTUBE_API_KEY;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Parsea duración ISO 8601 → segundos (PT4M30S → 270)
function parseDurationSeconds(iso) {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + (parseInt(m[3] || 0));
}

const SHORTS_MAX_SECONDS = 180;

function getTwoWeeksAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString();
}

function getThirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

async function fetchVideoDetails(videoIds) {
  if (!videoIds || videoIds.length === 0) return [];
  const ids = Array.isArray(videoIds) ? videoIds.join(',') : videoIds;
  try {
    const res = await axios.get(`${BASE_URL}/videos`, {
      params: {
        key: API_KEY,
        part: 'snippet,statistics,contentDetails,status,topicDetails',
        id: ids
      }
    });
    return res.data.items || [];
  } catch (err) {
    console.error('YouTube fetchVideoDetails error:', err.response?.data?.error?.message || err.message);
    return [];
  }
}

async function fetchByQuery(query, opts = {}) {
  const params = {
    key: API_KEY,
    part: 'snippet',
    type: 'video',
    maxResults: opts.maxResults || 25,
    order: opts.order || 'relevance',
    safeSearch: opts.safeSearch || 'none'
  };
  if (query) params.q = query;
  if (opts.publishedAfter) params.publishedAfter = opts.publishedAfter;
  if (opts.videoCategoryId) params.videoCategoryId = opts.videoCategoryId;
  if (opts.regionCode) params.regionCode = opts.regionCode;
  if (opts.relevanceLanguage) params.relevanceLanguage = opts.relevanceLanguage;
  if (opts.videoDuration) params.videoDuration = opts.videoDuration;

  try {
    const res = await axios.get(`${BASE_URL}/search`, { params });
    return (res.data.items || []).map(i => i.id?.videoId).filter(Boolean);
  } catch (err) {
    console.error('YouTube fetchByQuery error:', err.response?.data?.error?.message || err.message);
    return [];
  }
}

async function fetchByChart(opts = {}) {
  const params = {
    key: API_KEY,
    part: 'snippet,statistics,contentDetails,status,topicDetails',
    chart: 'mostPopular',
    maxResults: opts.maxResults || 50
  };
  if (opts.regionCode) params.regionCode = opts.regionCode;
  if (opts.videoCategoryId) params.videoCategoryId = opts.videoCategoryId;

  try {
    const res = await axios.get(`${BASE_URL}/videos`, { params });
    return res.data.items || [];
  } catch (err) {
    console.error('YouTube fetchByChart error:', err.response?.data?.error?.message || err.message);
    return [];
  }
}

// YouTube category IDs safe (no music, no movies)
const SAFE_CHART_CATEGORIES = ['20', '22', '23', '24', '25', '26', '27', '28'];

async function fetchCategoryVideos(categoryKey, maxResults = 80) {
  const strategy = getStrategy(categoryKey);
  const isShorts = strategy.isShorts || false;
  const allVideos = new Map();

  if (!isShorts) {
    // ── Videos largos: usar chart + búsqueda con fecha ──────────────────────
    const chartRegions = strategy.chartRegions.slice(0, 3);
    console.log(`[YouTube] Charts para ${categoryKey}: ${chartRegions.join(', ')}`);

    for (const region of chartRegions) {
      for (const catId of SAFE_CHART_CATEGORIES) {
        try {
          const videos = await fetchByChart({ maxResults: 20, regionCode: region, videoCategoryId: catId });
          videos.forEach(v => {
            if (v.id && typeof v.id === 'string') allVideos.set(v.id, v);
          });
        } catch (e) {
          console.error(`[YouTube] Chart error ${region}/${catId}:`, e.message);
        }
        await sleep(200);
      }
    }
    console.log(`[YouTube] Charts: ${allVideos.size} videos únicos`);

    // Búsqueda reciente (últimas 2 semanas)
    for (const query of strategy.queries) {
      try {
        const ids = await fetchByQuery(query, {
          maxResults: 25,
          order: 'date',
          publishedAfter: getTwoWeeksAgo(),
          regionCode: strategy.chartRegions[0],
          relevanceLanguage: strategy.relevanceLanguage,
          safeSearch: strategy.safeSearch,
        });
        if (ids.length > 0) {
          const details = await fetchVideoDetails(ids);
          details.forEach(v => { if (v.id) allVideos.set(v.id, v); });
          console.log(`[YouTube] Search "${query}": ${ids.length}`);
        }
      } catch (e) {
        console.error(`[YouTube] Search error "${query}":`, e.message);
      }
      await sleep(300);
    }

    // Filtrar por fecha de publicación
    const twoWeeksAgo = new Date(getTwoWeeksAgo());
    const thirtyDaysAgo = new Date(getThirtyDaysAgo());

    let filtered = [...allVideos.values()].filter(v => {
      const pub = new Date(v.snippet?.publishedAt);
      return !isNaN(pub.getTime()) && pub >= twoWeeksAgo;
    });

    if (filtered.length < 15) {
      console.log(`[YouTube] Solo ${filtered.length} videos en 14 días, ampliando a 30...`);
      filtered = [...allVideos.values()].filter(v => {
        const pub = new Date(v.snippet?.publishedAt);
        return !isNaN(pub.getTime()) && pub >= thirtyDaysAgo;
      });
    }

    // Pre-filtrar: eliminar Shorts (≤180s) ANTES de ordenar y cortar
    // Esto garantiza que devolvemos videos largos, no Shorts que dominan las vistas
    const longOnly = filtered.filter(v => {
      const secs = parseDurationSeconds(v.contentDetails?.duration || '');
      return secs === 0 || secs > SHORTS_MAX_SECONDS; // 0 = sin datos → asumir largo
    });

    const pool = longOnly.length >= 20 ? longOnly : filtered; // fallback si muy pocos
    if (longOnly.length < filtered.length) {
      console.log(`[YouTube] Pre-filtro long videos: ${filtered.length} → ${pool.length}`);
    }

    pool.sort((a, b) =>
      parseInt(b.statistics?.viewCount || 0) - parseInt(a.statistics?.viewCount || 0)
    );

    console.log(`[YouTube] ${categoryKey}: ${pool.length} videos largos disponibles`);
    return pool.slice(0, maxResults);

  } else {
    // ── Shorts: usar SOLO búsqueda con videoDuration=short ──────────────────
    // El chart no devuelve Shorts. Usamos búsqueda por relevancia sin filtro de fecha
    // para encontrar los Shorts más virales.
    console.log(`[YouTube] Buscando Shorts para ${categoryKey}...`);

    for (const query of strategy.queries) {
      try {
        const ids = await fetchByQuery(query, {
          maxResults: 50,
          order: 'relevance',
          // Sin publishedAfter — los Shorts virales pueden ser recientes o de hace semanas
          regionCode: strategy.chartRegions[0],
          relevanceLanguage: strategy.relevanceLanguage,
          safeSearch: strategy.safeSearch,
          videoDuration: 'short',  // YouTube filtra videos < 4 minutos
        });
        if (ids.length > 0) {
          const details = await fetchVideoDetails(ids);
          details.forEach(v => { if (v.id) allVideos.set(v.id, v); });
          console.log(`[YouTube] Shorts search "${query}": ${ids.length}`);
        }
      } catch (e) {
        console.error(`[YouTube] Shorts search error "${query}":`, e.message);
      }
      await sleep(300);
    }

    if (allVideos.size === 0) {
      console.warn(`[YouTube] No Shorts encontrados para ${categoryKey}`);
      return [];
    }

    // Ordenar por vistas
    const sorted = [...allVideos.values()].sort((a, b) =>
      parseInt(b.statistics?.viewCount || 0) - parseInt(a.statistics?.viewCount || 0)
    );

    console.log(`[YouTube] ${categoryKey}: ${sorted.length} Shorts recolectados`);
    return sorted.slice(0, maxResults);
  }
}

async function fetchVideoComments(videoId, maxResults = 20) {
  try {
    const res = await axios.get(`${BASE_URL}/commentThreads`, {
      params: {
        key: API_KEY,
        part: 'snippet',
        videoId,
        maxResults,
        order: 'relevance'
      }
    });
    return (res.data.items || []).map(item => item.snippet.topLevelComment.snippet.textDisplay);
  } catch {
    return [];
  }
}

const strategies = getAllStrategies();
const CATEGORY_CONFIGS = {
  espanol:       { name: 'Top Español',        icon: '🇪🇸', color: '#ff4757', description: strategies.espanol.description,       type: 'long'   },
  ingles:        { name: 'Top Inglés',          icon: '🇺🇸', color: '#4cc9f0', description: strategies.ingles.description,        type: 'long'   },
  espanolShorts: { name: 'Top Shorts Español',  icon: '📱', color: '#ff6b35', description: strategies.espanolShorts.description,  type: 'shorts' },
  inglesShorts:  { name: 'Top Shorts Inglés',   icon: '📲', color: '#7c3aed', description: strategies.inglesShorts.description,   type: 'shorts' }
};

module.exports = { fetchCategoryVideos, fetchVideoDetails, fetchVideoComments, CATEGORY_CONFIGS };
