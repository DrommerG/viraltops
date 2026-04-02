/**
 * AGENTE: VIRAL QUALITY AGENT
 * Filtra videos con pocas vistas y rankea por número de visitas.
 * El ranking se basa únicamente en view count: más vistas = posición más alta.
 */

const MIN_VIEWS = {
  espanol:       200_000,
  ingles:        400_000,
  espanolShorts:  30_000,   // Shorts virales en español (pool limitado, umbral bajo)
  inglesShorts:   80_000,   // Shorts virales en inglés (pool limitado, umbral bajo)
  default:        50_000
};

function filterAndRankByQuality(videos, categoryKey) {
  if (!videos || videos.length === 0) return [];

  const minViews = MIN_VIEWS[categoryKey] || MIN_VIEWS.default;

  const viewFiltered = videos.filter(v => {
    if ((v.viewCount || 0) < minViews) {
      console.log(`[ViralQuality] ❌ Pocas vistas: "${(v.title || '').substring(0, 50)}" (${(v.viewCount || 0).toLocaleString()})`);
      return false;
    }
    return true;
  });

  console.log(`[ViralQuality] Filtro vistas (>${(minViews / 1000).toFixed(0)}K): ${videos.length} → ${viewFiltered.length}`);

  if (viewFiltered.length === 0) {
    console.warn('[ViralQuality] Sin videos tras filtro, usando top por vistas...');
    return [...videos].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 30);
  }

  // Rankear únicamente por número de visitas
  const sorted = [...viewFiltered].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));

  // Calcular score de viralidad relativo al #1 para la barra de porcentaje en el frontend
  const maxViews = sorted[0]?.viewCount || 1;
  const scored = sorted.map(v => ({
    ...v,
    viralQualityScore: (v.viewCount || 0) / maxViews
  }));

  console.log(`[ViralQuality] Top: "${(scored[0]?.title || '').substring(0, 50)}" (${(scored[0]?.viewCount || 0).toLocaleString()} vistas)`);

  return scored;
}

module.exports = { filterAndRankByQuality };
