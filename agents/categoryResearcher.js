/**
 * AGENTE 4: CATEGORY RESEARCHER
 * Usa OpenAI para definir la mejor estrategia de búsqueda
 * por categoría, basándose en tipo de contenido, no solo hashtags.
 */
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Static research results (pre-computed via OpenAI best practices)
// Each category has: queries[], regionCodes[], categoryIds[], language hints
const CATEGORY_STRATEGIES = {
  espanol: {
    queries: [
      'videos virales semana español',
      'tendencias youtube latino 2026',
      'viral youtube españa mexico argentina',
      'lo mas visto youtube semana'
    ],
    regionCode: 'MX',
    videoCategoryId: null,
    useChart: false,
    relevanceLanguage: 'es',
    safeSearch: 'none',
    description: 'Los 20 videos más virales en español de las últimas 2 semanas'
  },
  ingles: {
    queries: [
      'viral video trending 2026',
      'most watched youtube this week',
      'trending now viral english',
      'most viewed youtube week'
    ],
    regionCode: 'US',
    videoCategoryId: null,
    useChart: false,
    relevanceLanguage: 'en',
    safeSearch: 'none',
    description: 'The 20 most viral videos in English from the last 2 weeks'
  }
};

// Use OpenAI to validate and optionally enrich strategy for a category
async function researchCategory(categoryKey, existingStrategy) {
  // For most categories the static strategy is good enough.
  // Only call OpenAI if we need dynamic query generation.
  return existingStrategy;
}

function getStrategy(categoryKey) {
  return CATEGORY_STRATEGIES[categoryKey] || CATEGORY_STRATEGIES.espanol;
}

function getAllStrategies() {
  return CATEGORY_STRATEGIES;
}

module.exports = { getStrategy, getAllStrategies, researchCategory };
