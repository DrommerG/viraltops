/**
 * AGENTE 1: VIDEO COLLECTOR
 * Recolecta los videos más vistos de YouTube por categoría
 * usando la YouTube Data API v3
 */

const { fetchCategoryVideos, CATEGORY_CONFIGS } = require('../services/youtubeService');

async function run(categoryKeys) {
  console.log(`[VideoCollector] Iniciando recolección para ${categoryKeys.length} categorías...`);
  const results = {};

  for (const key of categoryKeys) {
    const config = CATEGORY_CONFIGS[key];
    if (!config) continue;

    console.log(`[VideoCollector] Procesando: ${config.name}`);
    try {
      const videos = await fetchCategoryVideos(key, 50);

      const cleaned = videos
        .filter(v => v.id && v.snippet && v.statistics && v.status?.embeddable !== false)
        .map(v => ({
          id: typeof v.id === 'string' ? v.id : (v.id?.videoId || v.id),
          title: v.snippet.title,
          channelTitle: v.snippet.channelTitle,
          channelId: v.snippet.channelId,
          description: v.snippet.description || '',
          publishedAt: v.snippet.publishedAt,
          thumbnail: v.snippet.thumbnails?.maxres?.url ||
                     v.snippet.thumbnails?.high?.url ||
                     v.snippet.thumbnails?.medium?.url || '',
          tags: v.snippet.tags || [],
          viewCount: parseInt(v.statistics.viewCount || 0),
          likeCount: parseInt(v.statistics.likeCount || 0),
          commentCount: parseInt(v.statistics.commentCount || 0),
          duration: v.contentDetails?.duration || '',
          embeddable: v.status?.embeddable ?? true,
          categoryKey: key
        }));

      results[key] = cleaned;
      console.log(`[VideoCollector] ${config.name}: ${cleaned.length} videos recolectados`);
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error(`[VideoCollector] Error en ${key}:`, err.message);
      results[key] = [];
    }
  }

  return results;
}

module.exports = { run };
