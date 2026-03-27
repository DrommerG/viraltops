require('dotenv').config();
const axios = require('axios');
const { getStrategy, getAllStrategies } = require('../agents/categoryResearcher');

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.YOUTUBE_API_KEY;

function getLastMonthDate() {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString();
}

async function fetchVideoDetails(videoIds) {
  if (!videoIds) return [];
  try {
    const res = await axios.get(`${BASE_URL}/videos`, {
      params: {
        key: API_KEY,
        part: 'snippet,statistics,contentDetails,status',
        id: videoIds
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
    order: 'viewCount',
    safeSearch: opts.safeSearch || 'none'
  };
  if (query) params.q = query;
  if (!opts.noDateFilter) params.publishedAfter = getLastMonthDate();
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

async function fetchCategoryVideos(categoryKey, maxResults = 50) {
  const strategy = getStrategy(categoryKey);

  // Chart-based fetch (mundial, historico)
  if (strategy.useChart) {
    return await fetchByChart({ maxResults, regionCode: strategy.regionCode, videoCategoryId: strategy.videoCategoryId });
  }

  // Query-based fetch - run all queries and merge unique IDs
  const allIds = new Set();
  const perQuery = Math.ceil(maxResults / (strategy.queries.length || 1));

  for (const query of strategy.queries) {
    const ids = await fetchByQuery(query, {
      maxResults: perQuery,
      safeSearch: strategy.safeSearch,
      videoCategoryId: strategy.videoCategoryId,
      regionCode: strategy.regionCode,
      relevanceLanguage: strategy.relevanceLanguage,
      noDateFilter: strategy.noDateFilter
    });
    ids.forEach(id => allIds.add(id));
    if (allIds.size >= maxResults) break;
    await new Promise(r => setTimeout(r, 200));
  }

  if (allIds.size === 0) return [];
  const idString = [...allIds].slice(0, maxResults).join(',');
  return await fetchVideoDetails(idString);
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

// CATEGORY_CONFIGS for backward compatibility with server.js /api/categories
const strategies = getAllStrategies();
const CATEGORY_CONFIGS = {
  espanol: { name: 'Top Español', icon: '🇪🇸', color: '#ff4757', description: strategies.espanol.description },
  ingles:  { name: 'Top Inglés',  icon: '🇺🇸', color: '#4cc9f0', description: strategies.ingles.description }
};

module.exports = { fetchCategoryVideos, fetchVideoDetails, fetchVideoComments, CATEGORY_CONFIGS };
