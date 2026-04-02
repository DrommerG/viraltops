/**
 * AGENTE: CATEGORY RESEARCHER
 * Define estrategias de búsqueda por categoría.
 */

const CATEGORY_STRATEGIES = {
  espanol: {
    chartRegions: ['MX', 'ES', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'DO'],
    queries: [
      'vlog viral YouTube español 2025',
      'gaming viral YouTube español',
      'humor viral YouTube español',
      'reto viral YouTube español',
      'storytime viral YouTube español',
      'youtuber viral México 2025',
      'youtuber viral España 2025',
      'trending viral YouTube latinoamérica',
      'reacción viral YouTube español',
      'video viral tendencia español 2025',
    ],
    relevanceLanguage: 'es',
    safeSearch: 'none',
    description: 'Los 20 videos largos más virales en español',
    isShorts: false
  },
  ingles: {
    chartRegions: ['US', 'GB', 'AU', 'CA', 'NZ', 'IE'],
    queries: [
      'viral vlog YouTube 2025',
      'viral gaming YouTube 2025',
      'viral comedy YouTube English',
      'viral challenge YouTube 2025',
      'viral reaction YouTube English',
      'trending youtuber USA 2025',
      'funny viral YouTube 2025',
    ],
    relevanceLanguage: 'en',
    safeSearch: 'none',
    description: 'The 20 most viral long videos in English',
    isShorts: false
  },
  espanolShorts: {
    chartRegions: ['MX', 'ES', 'AR', 'CO', 'CL'],
    queries: [
      'shorts viral español 2025',
      'shorts humor viral español',
      'shorts gaming viral español',
      'shorts challenge viral español',
      'shorts viral mexico 2025',
      'shorts viral argentina 2025',
      'shorts entretenimiento español',
    ],
    relevanceLanguage: 'es',
    safeSearch: 'none',
    description: 'Los 20 Shorts más virales en español',
    isShorts: true
  },
  inglesShorts: {
    chartRegions: ['US', 'GB', 'AU', 'CA'],
    queries: [
      'shorts viral english 2025',
      'shorts viral comedy english',
      'shorts viral gaming english',
      'shorts viral challenge english',
      'shorts trending USA 2025',
      'shorts viral funny english',
      'shorts viral moments 2025',
      'satisfying viral shorts english',
      'viral prank shorts english',
      'viral reaction shorts 2025',
      'mind blowing shorts viral',
      'viral sports shorts english',
    ],
    relevanceLanguage: 'en',
    safeSearch: 'none',
    description: 'The 20 most viral Shorts in English',
    isShorts: true
  }
};

function getStrategy(categoryKey) {
  return CATEGORY_STRATEGIES[categoryKey] || CATEGORY_STRATEGIES.espanol;
}

function getAllStrategies() {
  return CATEGORY_STRATEGIES;
}

module.exports = { getStrategy, getAllStrategies };
