/**
 * AGENTE: DEEP VIRAL RESEARCH
 * Investiga en profundidad cuáles videos son realmente los más virales.
 * Va ENTRE ViralQualityAgent y ViralAnalyzer en el pipeline.
 *
 * En vez de rankear solo por vistas totales, calcula:
 * - Velocidad de vistas: cuántas vistas gana por día (más reciente = más impacto)
 * - Engagement rate: interacciones (likes + comentarios) vs vistas
 * - Score viral profundo: combina ambos para encontrar el contenido que realmente está despegando
 */

function daysSince(publishedAt) {
  const pub = new Date(publishedAt);
  if (isNaN(pub.getTime())) return 7;
  const diff = (Date.now() - pub.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(diff, 0.5); // mínimo 0.5 días para evitar división por cero
}

function scoreVideo(video) {
  const views = video.viewCount || 0;
  const likes = video.likeCount || 0;
  const comments = video.commentCount || 0;
  const days = daysSince(video.publishedAt);

  // Velocidad de vistas: vistas por día desde que se publicó
  const viewVelocity = views / days;

  // Engagement rate: cuánta gente interactúa vs cuánta lo ve
  // Los comentarios valen 2x porque requieren más esfuerzo que un like
  const engagementRate = views > 0 ? (likes + comments * 2) / views : 0;

  // Score final: velocidad amplificada por engagement (cap en 3x para evitar outliers)
  const deepScore = viewVelocity * (1 + Math.min(engagementRate * 10, 2));

  return {
    ...video,
    viewVelocity: Math.round(viewVelocity),
    engagementRate: parseFloat(engagementRate.toFixed(4)),
    deepViralScore: Math.round(deepScore)
  };
}

function researchDeepVirality(videos, topN = 40) {
  if (!videos || videos.length === 0) return [];

  console.log(`[DeepViral] Investigando viralidad profunda de ${videos.length} videos...`);

  const scored = videos.map(scoreVideo);
  scored.sort((a, b) => b.deepViralScore - a.deepViralScore);

  const top = scored.slice(0, topN);

  if (top.length > 0) {
    const best = top[0];
    console.log(
      `[DeepViral] #1: "${(best.title || '').substring(0, 50)}" ` +
      `— ${best.viewVelocity.toLocaleString()} vistas/día, ` +
      `engagement: ${(best.engagementRate * 100).toFixed(2)}%`
    );
  }

  console.log(`[DeepViral] Seleccionados ${top.length} de ${videos.length} candidatos`);
  return top;
}

module.exports = { researchDeepVirality };
