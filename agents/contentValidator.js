/**
 * AGENTE 5: CONTENT VALIDATOR
 * Filtra videos que no pertenecen al idioma de la categoría.
 * Valida usando el título y nombre del canal.
 */
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CATEGORY_PROMPTS = {
  espanol: `Clasifica si cada video es de contenido hispanohablante (español/latino).
PERTENECE si: el título está en español, el canal es latinoamericano o español, o el contenido es claramente en español.
NO PERTENECE si: el título es completamente en inglés Y el canal parece angloparlante (USA, UK, etc.).
Canales gaming en inglés que salen en búsquedas mexicanas generalmente NO pertenecen.`,

  ingles: `Classify if each video is English-language content.
BELONGS if: the title is in English and the channel appears to be from USA, UK, Australia, or Canada.
DOES NOT BELONG if: the title is in Spanish or the channel is clearly Latin American/Spanish.`
};

async function validateBatch(videos, categoryKey) {
  if (!videos || videos.length === 0) return [];

  const categoryPrompt = CATEGORY_PROMPTS[categoryKey];
  if (!categoryPrompt) return videos; // no filter for unknown categories

  const videoList = videos.slice(0, 30).map((v, i) =>
    `${i}: "${v.title}" | Canal: ${v.channelTitle}`
  ).join('\n');

  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `${categoryPrompt}

VIDEOS:
${videoList}

Responde SOLO con JSON: {"results": [true, false, true, ...]} (true = pertenece, false = no pertenece)`
      }],
      response_format: { type: 'json_object' },
      max_tokens: 300,
      temperature: 0
    });

    const parsed = JSON.parse(res.choices[0].message.content);
    const results = parsed.results || [];
    const validated = videos.filter((_, i) => results[i] !== false);
    console.log(`[ContentValidator] ${categoryKey}: ${videos.length} → ${validated.length} videos`);
    return validated;
  } catch (err) {
    console.error(`[ContentValidator] Error en ${categoryKey}:`, err.message);
    return videos;
  }
}

async function validateAllCategories(rawData) {
  console.log('[ContentValidator] Validando idioma de videos...');
  const validated = {};

  for (const [key, videos] of Object.entries(rawData)) {
    if (!videos || videos.length === 0) {
      validated[key] = [];
      continue;
    }
    validated[key] = await validateBatch(videos, key);
    await new Promise(r => setTimeout(r, 400));
  }

  return validated;
}

module.exports = { validateAllCategories };
