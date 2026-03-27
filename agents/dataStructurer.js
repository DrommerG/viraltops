/**
 * AGENTE 3: DATA STRUCTURER
 * Organiza, estructura y guarda los datos finales en caché
 */

const { saveCache, getCurrentWeekKey } = require('../services/cacheService');
const { CATEGORY_CONFIGS } = require('../services/youtubeService');

function formatDuration(isoDuration) {
  if (!isoDuration) return 'N/A';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 'N/A';
  const h = parseInt(match[1] || 0);
  const m = parseInt(match[2] || 0);
  const s = parseInt(match[3] || 0);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatNumber(n) {
  if (!n && n !== 0) return 'N/A';
  const num = Number(n);
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
}

function structureVideo(video) {
  return {
    rank: video.rank,
    id: video.id,
    title: video.title,
    channelTitle: video.channelTitle,
    channelId: video.channelId,
    publishedAt: video.publishedAt,
    thumbnail: video.thumbnail,
    duration: formatDuration(video.duration),
    stats: {
      views: video.viewCount,
      viewsFormatted: formatNumber(video.viewCount),
      likes: video.likeCount,
      likesFormatted: formatNumber(video.likeCount),
      comments: video.commentCount,
      commentsFormatted: formatNumber(video.commentCount)
    },
    scores: {
      virality: Math.round(video.finalScore * 100),
      sentiment: Math.round((video.sentimentScore || 0.7) * 100),
      aiScore: video.aiAnalysis?.puntuacion_viralidad || 7
    },
    analysis: {
      porqueEsViral: video.aiAnalysis?.porque_es_viral || '',
      patrones: video.aiAnalysis?.patrones || [],
      enganchePrincipal: video.aiAnalysis?.enganche_principal || '',
      consejoCreadores: video.aiAnalysis?.consejo_creadores || ''
    },
    automation: {
      tipoContenido: video.automation?.tipo_contenido || '',
      sePuedeAutomatizar: video.automation?.se_puede_automatizar ?? true,
      nivelDificultad: video.automation?.nivel_dificultad || 'Medio',
      herramientas: video.automation?.herramientas || [],
      pasos: video.automation?.pasos || [],
      tiempoEstimado: video.automation?.tiempo_estimado || '',
      costoEstimado: video.automation?.costo_estimado || '',
      consejoClaveAuto: video.automation?.consejo_clave || ''
    },
    urls: {
      watch: `https://www.youtube.com/watch?v=${video.id}`,
      embed: `https://www.youtube.com/embed/${video.id}?autoplay=1`,
      channel: `https://www.youtube.com/channel/${video.channelId}`
    }
  };
}

function run(analyzedData) {
  console.log('[DataStructurer] Estructurando y guardando datos...');

  const structured = {};

  for (const [key, videos] of Object.entries(analyzedData)) {
    const config = CATEGORY_CONFIGS[key];
    if (!config) continue;

    structured[key] = {
      meta: {
        key,
        name: config.name,
        icon: config.icon,
        color: config.color,
        description: config.description,
        updatedAt: new Date().toISOString(),
        totalVideos: videos.length
      },
      videos: videos.map(structureVideo)
    };
  }

  const cacheData = {
    weekKey: getCurrentWeekKey(),
    updatedAt: new Date().toISOString(),
    categories: structured
  };

  saveCache(cacheData);
  console.log(`[DataStructurer] Cache guardado. ${Object.keys(structured).length} categorías.`);

  return cacheData;
}

module.exports = { run };
