/**
 * AGENTE 5: CONTENT VALIDATOR
 * Valida que los videos pertenecen a su categoría usando OpenAI.
 * Filtra videos que no corresponden y organiza el resultado final.
 */
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CATEGORY_DESCRIPTIONS = {
  mundial: 'cualquier video viral global',
  espanol: 'video cuyo idioma principal es español',
  ingles: 'video cuyo idioma principal es inglés',
  ninos: 'contenido infantil apto para niños menores de 12 años',
  videojuegos: 'contenido sobre videojuegos, gaming, gameplay o esports',
  documentales: 'documental, reportaje o contenido educativo de larga duración',
  entretenimiento: 'entretenimiento general, shows, reality, sketch comedy',
  musica: 'video musical oficial o presentación musical',
  ia: 'video generado o creado principalmente con inteligencia artificial',
  deportes: 'deportes, atletismo, competencias deportivas',
  tecnologia: 'tecnología, gadgets, software, innovación',
  comedia: 'comedia, humor, sketches, stand-up',
  historico: 'cualquier video muy popular'
};

// Validate a batch of videos for a category using OpenAI
async function validateBatch(videos, categoryKey) {
  if (!videos || videos.length === 0) return [];
  if (categoryKey === 'mundial' || categoryKey === 'historico') return videos; // No filtering needed

  const categoryDesc = CATEGORY_DESCRIPTIONS[categoryKey] || 'contenido general';

  // Build a compact list for OpenAI to evaluate
  const videoList = videos.slice(0, 20).map((v, i) =>
    `${i}: "${v.title}" | Canal: ${v.channelTitle}`
  ).join('\n');

  try {
    const prompt = `Eres un experto en clasificación de contenido de YouTube.

CATEGORÍA: "${categoryDesc}"

VIDEOS A EVALUAR:
${videoList}

Para cada video, decide si PERTENECE (true) o NO PERTENECE (false) a la categoría.
Responde SOLO con JSON: {"results": [true, false, true, ...]} (un boolean por cada video en orden)`;

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 200,
      temperature: 0
    });

    const parsed = JSON.parse(res.choices[0].message.content);
    const results = parsed.results || [];

    const validated = videos.filter((_, i) => results[i] !== false);
    console.log(`[ContentValidator] ${categoryKey}: ${videos.length} → ${validated.length} videos validados`);
    return validated;
  } catch (err) {
    console.error(`[ContentValidator] Error validando ${categoryKey}:`, err.message);
    return videos; // Return all if validation fails
  }
}

async function validateAllCategories(rawData) {
  console.log('[ContentValidator] Iniciando validación de categorías...');
  const validated = {};

  for (const [key, videos] of Object.entries(rawData)) {
    if (!videos || videos.length === 0) {
      validated[key] = [];
      continue;
    }
    validated[key] = await validateBatch(videos, key);
    await new Promise(r => setTimeout(r, 300));
  }

  return validated;
}

module.exports = { validateAllCategories };
