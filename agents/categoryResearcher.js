/**
 * AGENTE 4: CATEGORY RESEARCHER
 * Define estrategias de búsqueda por categoría.
 * Usa chartRegions (chart mostPopular) + queries (búsqueda con filtro de fecha).
 */

const CATEGORY_STRATEGIES = {
  espanol: {
    chartRegions: ['MX', 'ES', 'AR', 'CO'],
    queries: [
      'viral español',
      'tendencias youtube',
      'videos populares',
      'mas visto semana'
    ],
    relevanceLanguage: 'es',
    safeSearch: 'none',
    description: 'Los 20 videos más virales en español de las últimas 2 semanas'
  },
  ingles: {
    chartRegions: ['US', 'GB', 'AU', 'CA'],
    queries: [
      'viral video',
      'trending youtube',
      'popular this week',
      'most watched'
    ],
    relevanceLanguage: 'en',
    safeSearch: 'none',
    description: 'The 20 most viral videos in English from the last 2 weeks'
  }
};

function getStrategy(categoryKey) {
  return CATEGORY_STRATEGIES[categoryKey] || CATEGORY_STRATEGIES.espanol;
}

function getAllStrategies() {
  return CATEGORY_STRATEGIES;
}

module.exports = { getStrategy, getAllStrategies };
