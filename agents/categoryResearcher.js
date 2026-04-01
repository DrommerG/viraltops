/**
 * AGENTE: CATEGORY RESEARCHER
 * Define estrategias de búsqueda por categoría.
 */

const CATEGORY_STRATEGIES = {
  espanol: {
    chartRegions: ['MX', 'ES', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'DO'],
    queries: [
      'vlog viral YouTube español 2025',
      'reacción viral YouTube español',
      'reto viral YouTube español',
      'storytime viral YouTube español',
      'gaming viral YouTube español',
      'humor viral YouTube español',
      'challenge viral YouTube español',
      'podcast viral YouTube español',
      'documental viral YouTube español',
      'experimento viral YouTube español',
      'prank viral YouTube español',
      'youtuber viral México 2025',
      'youtuber viral España 2025',
      'youtuber viral Argentina 2025',
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
      'viral reaction YouTube English',
      'viral challenge YouTube 2025',
      'viral storytime YouTube',
      'viral gaming YouTube 2025',
      'viral prank YouTube 2025',
      'viral comedy YouTube English',
      'viral documentary YouTube',
      'viral podcast YouTube English',
      'viral experiment YouTube 2025',
      'trending youtuber USA 2025',
      'trending youtuber UK 2025',
      'viral entertainment YouTube English',
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
      'shorts entretenimiento español',
      'shorts reaccion viral español',
      'shorts reto viral español',
      'shorts prank viral español',
      'shorts comedia viral españa',
      'shorts viral mexico 2025',
      'shorts viral argentina 2025',
      'shorts viral colombia 2025',
      'shorts creador contenido español',
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
      'shorts viral prank english',
      'shorts viral funny english',
      'shorts viral reaction english',
      'shorts trending USA 2025',
      'shorts trending UK 2025',
      'shorts viral entertainment english',
      'shorts viral content creator',
      'shorts viral moments 2025',
      'shorts funny viral 2025',
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
