require('dotenv').config();
const axios = require('axios');
const { getStrategy, getAllStrategies } = require('../agents/categoryResearcher');

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.YOUTUBE_API_KEY;

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
        part: 'snippet,statistics,contentDetails,status',
        id: ids
      }
    });
    return res.data.items || [];
  } catch (err) {
    console.error('YouTube fetchVideoDetails error:', err.response?.data?.error?.message || err.message);
    return [];
  }
}

// Search with order=date (reliable with publishedAfter, unlike viewCount)
async function fetchByQuery(query, opts = {}) {
  const params = {
    key: API_KEY,
    part: 'snippet',
    type: 'video',
    maxResults: opts.maxResults || 25,
    order: 'date',        // IMPORTANT: 'date' is reliable; 'viewCount' breaks with publishedAfter
    safeSearch: opts.safeSearch || 'none'
  };
  if (query) params.q = query;
  params.publishedAfter = opts.publishedAfter || getTwoWeeksAgo();
  if (opts.videoCategoryId) params.videoCategoryId = opts.videoCategoryId;
  if (opts.regionCode) params.regionCode = opts.regionCode;
  if (opts.relevanceLanguage) params.relevanceLanguage = opts.relevanceLanguage;

  try {
    const res = await axios.get(`${BASE_URL}/search`, { params });
    return (res.data.items || []).map(i => i.id?.videoId).filter(Boolean);
  } catch (err) {
    console.error('YouTube fetchByQuery error:', err.response?.data?.error?.message || err.message);
    return [];
  }
}

// Fetch mostPopular chart — returns full video objects, NO date filter
async function fetchByChart(opts = {}) {
  const params = {
    key: API_KEY,
    part: 'snippet,statistics,contentDetails,status',
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

/**
 * Hybrid fetch: chart (most popular) + search (recent by date).
 * - Chart gives truly popular videos regardless of date.
 * - Search gives recently published videos (last 14 days).
 * - Combined, then filtered to last 14 days (or 30 if not enough).
 * - Sorted client-side by views + likes.
 */
async function fetchCategoryVideos(categoryKey, maxResults = 80) {
  const strategy = getStrategy(categoryKey);
  const allVideos = new Map(); // deduplicate by video ID

  // 1. Fetch mostPopular chart for each region
  console.log(`[YouTube] Fetching charts for ${categoryKey} (regions: ${strategy.chartRegions.join(', ')})`);
  for (const region of strategy.chartRegions) {
    try {
      const videos = await fetchByChart({ maxResults: 50, regionCode: region });
      videos.forEach(v => {
        if (v.id && typeof v.id === 'string') allVideos.set(v.id, v);
      });
      console.log(`[YouTube] Chart ${region}: ${videos.length} videos`);
    } catch (e) {
      console.error(`[YouTube] Chart error for ${region}:`, e.message);
    }
    await sleep(300);
  }

  // 2. Search with date filter for each query
  console.log(`[YouTube] Searching recent videos for ${categoryKey}...`);
  for (const query of strategy.queries) {
    try {
      const ids = await fetchByQuery(query, {
        maxResults: 25,
        regionCode: strategy.chartRegions[0],
        relevanceLanguage: strategy.relevanceLanguage,
        safeSearch: strategy.safeSearch
      });
      if (ids.length > 0) {
        // Batch fetch video details (1 API unit vs 100 for search)
        const details = await fetchVideoDetails(ids);
        details.forEach(v => {
          if (v.id) allVideos.set(v.id, v);
        });
        console.log(`[YouTube] Search "${query}": ${ids.length} found`);
      }
    } catch (e) {
      console.error(`[YouTube] Search error for "${query}":`, e.message);
    }
    await sleep(300);
  }

  if (allVideos.size === 0) {
    console.warn(`[YouTube] No videos found for ${categoryKey}`);
    return [];
  }

  // 3. Filter by publish date
  const twoWeeksAgo = new Date(getTwoWeeksAgo());
  const thirtyDaysAgo = new Date(getThirtyDaysAgo());

  let filtered = [...allVideos.values()].filter(v => {
    const pub = new Date(v.snippet?.publishedAt);
    return !isNaN(pub.getTime()) && pub >= twoWeeksAgo;
  });

  // Relax to 30 days if not enough results
  if (filtered.length < 15) {
    console.log(`[YouTube] Only ${filtered.length} videos in last 14 days for ${categoryKey}, relaxing to 30 days...`);
    filtered = [...allVideos.values()].filter(v => {
      const pub = new Date(v.snippet?.publishedAt);
      return !isNaN(pub.getTime()) && pub >= thirtyDaysAgo;
    });
  }

  // 4. Sort by views + likes (descending) — the actual viral ranking
  filtered.sort((a, b) => {
    const scoreA = parseInt(a.statistics?.viewCount || 0) * 0.6 + parseInt(a.statistics?.likeCount || 0) * 0.4;
    const scoreB = parseInt(b.statistics?.viewCount || 0) * 0.6 + parseInt(b.statistics?.likeCount || 0) * 0.4;
    return scoreB - scoreA;
  });

  console.log(`[YouTube] ${categoryKey}: ${filtered.length} videos after date filter (from ${allVideos.size} total)`);
  return filtered.slice(0, maxResults);
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

// CATEGORY_CONFIGS for /api/categories endpoint
const strategies = getAllStrategies();
const CATEGORY_CONFIGS = {
  espanol: { name: 'Top Español', icon: '🇪🇸', color: '#ff4757', description: strategies.espanol.description },
  ingles:  { name: 'Top Inglés',  icon: '🇺🇸', color: '#4cc9f0', description: strategies.ingles.description }
};

module.exports = { fetchCategoryVideos, fetchVideoDetails, fetchVideoComments, CATEGORY_CONFIGS };
