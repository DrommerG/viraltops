/**
 * AGENTE 2: CONTENT VALIDATOR
 * Filtra videos que no pertenecen al idioma de la categoría.
 * Usa defaultAudioLanguage cuando disponible + análisis con OpenAI.
 */
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Si el audio está declarado en un idioma diferente al de la categoría, excluir
const LANGUAGE_CODES = {
  espanol:       ['es', 'es-419', 'es-mx', 'es-es', 'es-ar', 'es-co', 'es-cl', 'es-pe'],
  ingles:        ['en', 'en-us', 'en-gb', 'en-au', 'en-ca'],
  espanolShorts: ['es', 'es-419', 'es-mx', 'es-es', 'es-ar', 'es-co', 'es-cl', 'es-pe'],
  inglesShorts:  ['en', 'en-us', 'en-gb', 'en-au', 'en-ca']
};

// Idiomas incompatibles con cada categoría
const INCOMPATIBLE_AUDIO = {
  espanol:       ['en', 'en-us', 'en-gb', 'en-au', 'en-ca', 'ko', 'ja', 'pt', 'fr', 'de', 'it', 'zh'],
  ingles:        ['es', 'es-419', 'es-mx', 'ko', 'ja', 'pt', 'fr', 'de', 'it', 'zh', 'hi', 'ar'],
  espanolShorts: ['en', 'en-us', 'en-gb', 'en-au', 'en-ca', 'ko', 'ja', 'pt', 'fr', 'de', 'it', 'zh'],
  inglesShorts:  ['es', 'es-419', 'es-mx', 'ko', 'ja', 'pt', 'fr', 'de', 'it', 'zh', 'hi', 'ar']
};

const CATEGORY_PROMPTS = {
  espanol: `Eres un experto en contenido de YouTube hispanohablante.
Clasifica si cada video es contenido válido de creadores hispanohablantes (español/latino) y NO es música ni trailer.

PERTENECE (true) si:
- El título está en español
- El canal es latinoamericano o español
- El contenido es: vlog, gaming, reacción, reto, storytime, humor, educación, entretenimiento, podcast, documental, deporte

NO PERTENECE (false) en CUALQUIERA de estos casos:
- Es una canción, video musical, álbum, single, EP, visualizer o cualquier contenido de música
- El canal contiene "VEVO", "Records", "Music", "Música" en el nombre
- El canal es de un artista o banda musical (aunque canten en español)
- Es un trailer, teaser, clip o avance de película o serie
- El título sugiere formato "Artista - Nombre canción" o tiene feat./ft.
- Es K-pop, reggaeton promocional, pop, trap o cualquier género musical
- Es contenido en vivo de un concierto o festival musical
- El título está completamente en inglés Y el canal es angloparlante
- Es de un artista coreano (BTS, BLACKPINK, etc.) aunque la canción sea en español o inglés
- El canal es de USA, UK, Australia o Canadá

REGLA CLAVE: Si hay CUALQUIER duda de que sea música o trailer → pon false.`,

  ingles: `You are an expert in English-language YouTube content.
Classify if each video is valid English-language creator content and NOT music or a trailer.

BELONGS (true) if:
- The title is in English
- The channel is from USA, UK, Australia, Canada, New Zealand or Ireland
- The content is: vlog, gaming, reaction, challenge, storytime, comedy, education, entertainment, podcast, documentary, sports

DOES NOT BELONG (false) in ANY of these cases:
- It is a song, music video, album, single, EP, visualizer or any music content
- The channel name contains "VEVO", "Records", "Music" or similar music label indicators
- The channel belongs to a music artist or band (even if they sing in English)
- It is a movie or TV show trailer, teaser or clip
- The title follows "Artist - Song Name" format or contains feat./ft.
- It is K-pop, pop, rap, or any music genre content
- It is a live concert or musical performance
- The title is in Spanish or any non-English language
- The channel is clearly Latin American or Spanish

KEY RULE: If there is ANY doubt it might be music or a trailer → mark false.`,

  espanolShorts: `Eres un experto en YouTube Shorts hispanohablantes.
Clasifica si cada Short es contenido válido de creadores hispanohablantes y NO es música ni trailer.

PERTENECE (true) si:
- El título está en español
- El canal es latinoamericano o español
- El contenido es: clip cómico, gaming clip, reacción corta, reto, humor, entretenimiento, deporte, lifestyle

NO PERTENECE (false) en CUALQUIERA de estos casos:
- Es un fragmento de canción, video musical o contenido de música
- El canal contiene "VEVO", "Records", "Music", "Música" en el nombre
- Es un teaser, trailer o clip promocional de película o serie
- Contiene feat./ft. en el título
- Es K-pop, pop, trap, reggaeton u otro género musical
- El título está en inglés Y el canal es angloparlante

REGLA CLAVE: Si hay CUALQUIER duda de que sea música o trailer → pon false.`,

  inglesShorts: `You are an expert in English-language YouTube Shorts.
Classify if each Short is valid English creator content and NOT music or a trailer.

BELONGS (true) if:
- The title is in English
- The channel is from USA, UK, Australia, Canada, NZ or Ireland
- The content is: comedy clip, gaming clip, reaction clip, challenge, entertainment, sports, lifestyle

DOES NOT BELONG (false) in ANY of these cases:
- It is a music clip, song excerpt or any music content
- The channel name contains "VEVO", "Records", "Music" or music label indicators
- It is a teaser or promotional clip for a movie or TV show
- It contains feat./ft. in the title
- It is K-pop, pop, rap or any music genre
- The title is in Spanish or any non-English language

KEY RULE: If there is ANY doubt it might be music or a trailer → mark false.`
};

function preFilterByAudioLanguage(videos, categoryKey) {
  const incompatible = INCOMPATIBLE_AUDIO[categoryKey] || [];
  if (incompatible.length === 0) return videos;

  const filtered = videos.filter(v => {
    const audioLang = (v.defaultAudioLanguage || '').toLowerCase();
    if (!audioLang) return true; // Sin datos → dejar para OpenAI
    if (incompatible.some(lang => audioLang.startsWith(lang))) {
      console.log(`[ContentValidator] ❌ Audio incompatible: "${v.title.substring(0, 50)}" (${audioLang})`);
      return false;
    }
    return true;
  });

  if (filtered.length < videos.length) {
    console.log(`[ContentValidator] Pre-filtro audio: ${videos.length} → ${filtered.length}`);
  }
  return filtered;
}

async function validateBatch(videos, categoryKey) {
  if (!videos || videos.length === 0) return [];

  // Pre-filtro por defaultAudioLanguage (rápido, sin API)
  const preFiltered = preFilterByAudioLanguage(videos, categoryKey);
  if (preFiltered.length === 0) return [];

  const categoryPrompt = CATEGORY_PROMPTS[categoryKey];
  if (!categoryPrompt) return preFiltered;

  const videoList = preFiltered.slice(0, 30).map((v, i) => {
    const lang = v.defaultAudioLanguage ? ` [audio: ${v.defaultAudioLanguage}]` : '';
    return `${i}: "${v.title}" | Canal: ${v.channelTitle}${lang}`;
  }).join('\n');

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
      max_tokens: 400,
      temperature: 0
    });

    const parsed = JSON.parse(res.choices[0].message.content);
    const results = parsed.results || [];
    const validated = preFiltered.filter((_, i) => results[i] !== false);
    console.log(`[ContentValidator] ${categoryKey}: ${videos.length} → ${validated.length} videos (OpenAI)`);
    return validated;
  } catch (err) {
    console.error(`[ContentValidator] Error en ${categoryKey}:`, err.message);
    return preFiltered;
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
