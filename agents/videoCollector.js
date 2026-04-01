/**
 * AGENTE 1: VIDEO COLLECTOR
 * Recolecta los videos más vistos de YouTube por categoría
 * usando la YouTube Data API v3
 */

const { fetchCategoryVideos, CATEGORY_CONFIGS } = require('../services/youtubeService');
const { filterExcludedContent, filterLongVideosOnly, filterShortsOnly } = require('./trendingDataAgent');
const { filterByTitle } = require('./titleFilterAgent');

async function run(categoryKeys) {
  console.log(`[VideoCollector] Iniciando recolección para ${categoryKeys.length} categorías...`);
  const results = {};

  for (const key of categoryKeys) {
    const config = CATEGORY_CONFIGS[key];
    if (!config) continue;

    console.log(`[VideoCollector] Procesando: ${config.name}`);
    try {
      const videos = await fetchCategoryVideos(key, 80);

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
          categoryId: v.snippet.categoryId || '',
          defaultAudioLanguage: v.snippet.defaultAudioLanguage || '',
          defaultLanguage: v.snippet.defaultLanguage || '',
          viewCount: parseInt(v.statistics.viewCount || 0),
          likeCount: parseInt(v.statistics.likeCount || 0),
          commentCount: parseInt(v.statistics.commentCount || 0),
          duration: v.contentDetails?.duration || '',
          embeddable: v.status?.embeddable ?? true,
          topicIds: v.topicDetails?.topicIds || [],
          topicCategories: v.topicDetails?.topicCategories || [],
          categoryKey: key
        }));

      // PASO 1: Filtro por título (palabras prohibidas — 100% determinista)
      const titleFiltered = filterByTitle(cleaned);

      // PASO 2: Filtro por contenido (categoría YouTube + topicDetails + patrones)
      const contentFiltered = filterExcludedContent(titleFiltered);

      // PASO 3: Filtro por duración según tipo de categoría
      let durationFiltered;
      if (config.type === 'shorts') {
        durationFiltered = filterShortsOnly(contentFiltered);
      } else {
        durationFiltered = filterLongVideosOnly(contentFiltered);
      }

      results[key] = durationFiltered;
      console.log(`[VideoCollector] ${config.name}: ${durationFiltered.length} videos finales (de ${cleaned.length} recolectados)`);
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error(`[VideoCollector] Error en ${key}:`, err.message);
      results[key] = [];
    }
  }

  return results;
}

module.exports = { run };
