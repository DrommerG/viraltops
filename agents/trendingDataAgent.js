/**
 * AGENTE: TRENDING DATA AGENT
 * Filtra contenido de Música, Trailers y Teasers con múltiples capas.
 * La capa más confiable es topicDetails (clasificación interna de YouTube).
 */

// ─── Capa 1: YouTube Category IDs ─────────────────────────────────────────────
// 10=Music, 43=Shows, 44=Trailers, 30=Movies, 18=Short Movies
const EXCLUDED_CATEGORY_IDS = new Set(['10', '43', '44', '30', '18']);

// ─── Capa 2: Freebase Topic IDs (clasificación interna de YouTube) ────────────
// YouTube asigna estos IDs automáticamente al analizar el contenido del video
const MUSIC_TOPIC_IDS = new Set([
  '/m/04rlf',   // Music (padre)
  '/m/02mscn',  // Christian music
  '/m/0ggq0m',  // Classical music
  '/m/01lyv',   // Country
  '/m/02lkt',   // Electronic music
  '/m/0glt670', // Hip hop music
  '/m/05rwpb',  // Independent music
  '/m/03_d0',   // Jazz
  '/m/028sqc',  // Music of Asia
  '/m/0g293',   // Music of Latin America
  '/m/064t9',   // Pop music
  '/m/06cqb',   // Reggae
  '/m/06j6l',   // Rhythm and blues
  '/m/06by7',   // Rock music
  '/m/0gywn',   // Soul music
]);
const FILM_TOPIC_IDS = new Set([
  '/m/02vxn',   // Film / Movie
  '/m/0f2f9',   // Action film
  '/m/01jfsb',  // Thriller film
  '/m/06l3p',   // Comedy film
  '/m/07s9rl0', // Animated film
]);

// ─── Capa 3: Patrones en topicCategories (URLs de Wikipedia) ─────────────────
// NOTA: "Film" fue eliminado porque YouTube lo asigna incorrectamente a clips de
// entretenimiento/comedia. Solo filtramos Música (muy preciso) y Soundtracks.
const EXCLUDED_TOPIC_URL_PATTERNS = [
  /\/wiki\/Music/i,          // Music + todos los subgéneros (Pop_music, Rock_music, etc.)
  /\/wiki\/.*[Mm]usic/,      // Latin_music, Hip_hop_music, etc.
  /\/wiki\/Soundtrack/i,     // Soundtracks
];

// ─── Capa 4: Patrones en el TÍTULO ────────────────────────────────────────────
const EXCLUDED_TITLE_PATTERNS = [
  // Formatos de video musical oficial
  /\bofficial\s*(music\s*)?video\b/i,
  /\(official\s*video\)/i,
  /\[official\s*video\]/i,
  /\bofficial\s*audio\b/i,
  /\(official\s*audio\)/i,
  /\[official\s*audio\]/i,
  /\blyric(s)?\s*video\b/i,
  /\(lyric(s)?\)/i,
  /\[lyric(s)?\]/i,
  /\bofficial\s*mv\b/i,
  /\(\s*mv\s*\)/i,
  /\bMV\b/,                   // MV solo (mayúsculas)
  /\baudio\s*oficial\b/i,
  /\bclip\s*oficial\b/i,
  /\bvideo\s*musical\b/i,
  /\bmúsica\s*oficial\b/i,
  /\(\s*letra\s*\)/i,
  /\bvisualizer\b/i,

  // Colaboraciones musicales
  /\bfeat\.\s/i,
  /\bft\.\s/i,
  /\(\s*feat\./i,
  /\(\s*ft\./i,
  /\bfeaturing\b/i,

  // Producción musical
  /\(\s*prod\.\s/i,
  /\bprod\.\s+by\b/i,

  // Versiones / Covers / Live
  /\bremix\b/i,
  /\bacoustic\s*(version|ver)?\b/i,
  /\(\s*acoustic\s*\)/i,
  /\blive\s+at\b/i,
  /\(\s*live\s*\)/i,
  /\(\s*en\s*vivo\s*\)/i,
  /\ben\s*vivo\b/i,
  /\blive\s*performance\b/i,
  /\bofficial\s*performance\b/i,
  /\bcover\s*(version|ver)?\b/i,
  /\(\s*cover\s*\)/i,

  // Trailers y Teasers — todos los formatos
  /\btrailer\b/i,
  /\bteaser\b/i,
  /\btráiler\b/i,
  /\bofficial\s*teaser\b/i,
  /\bofficial\s*trailer\b/i,
  /\bfinal\s*trailer\b/i,
  /\bexclusive\s*clip\b/i,

];

// ─── Capa 5: Patrones en el CANAL ─────────────────────────────────────────────
const EXCLUDED_CHANNEL_PATTERNS = [
  /vevo$/i,
  /\bvevo\b/i,
  /records\b/i,
  /\bmusic\s*(official|videos?|channel)?\b/i,
  /\bofficial\s*music\b/i,
  /soundtrack\b/i,
  /\bmusicals?\b/i,
  // Estudios de cine
  /\bpictures?\s*(official)?\b/i,
  /\bfilms?\s*(official)?\b/i,
  /\bcinema\b/i,
  /marvel\s*(entertainment|studios)/i,
  /\bwarner\s*bros\b/i,
  /\buniversal\s*pictures\b/i,
  /\bparamount\s*pictures\b/i,
  /\bsony\s*pictures\b/i,
  /\bdisney\b/i,
  /\bpixar\b/i,
  /netflix\s*(latinoamerica|films?|series|official)/i,
];

// ─── Parseo de duración ISO 8601 ──────────────────────────────────────────────
function parseDurationSeconds(iso) {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + (parseInt(m[3] || 0));
}

// ─── Verificar topicDetails ───────────────────────────────────────────────────
function hasExcludedTopic(video) {
  // Verificar topicIds (Freebase) — solo música
  const topicIds = video.topicIds || [];
  for (const id of topicIds) {
    if (MUSIC_TOPIC_IDS.has(id)) {
      return { excluded: true, reason: `topicId música: ${id}` };
    }
  }
  // Verificar topicCategories (URLs Wikipedia)
  const topicCategories = video.topicCategories || [];
  for (const url of topicCategories) {
    for (const pattern of EXCLUDED_TOPIC_URL_PATTERNS) {
      if (pattern.test(url)) {
        return { excluded: true, reason: `topic URL: ${url}` };
      }
    }
  }
  return { excluded: false };
}

// ─── Función principal de exclusión ──────────────────────────────────────────
function isExcludedContent(video) {
  // Capa 1: YouTube category ID
  const catId = String(video.categoryId || '');
  if (catId && EXCLUDED_CATEGORY_IDS.has(catId)) {
    return { excluded: true, reason: `categoría YouTube ${catId}` };
  }

  // Capa 2: Topic IDs y Topic Categories (más confiable que el categoryId)
  const topicCheck = hasExcludedTopic(video);
  if (topicCheck.excluded) return topicCheck;

  // Capa 3: Patrones en el título
  const title = video.title || '';
  for (const pattern of EXCLUDED_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      return { excluded: true, reason: `patrón título: "${title.substring(0, 60)}"` };
    }
  }

  // Capa 4: Patrones en el canal
  const channel = video.channelTitle || '';
  for (const pattern of EXCLUDED_CHANNEL_PATTERNS) {
    if (pattern.test(channel)) {
      return { excluded: true, reason: `patrón canal: "${channel}"` };
    }
  }

  return { excluded: false };
}

function filterExcludedContent(videos) {
  if (!videos || videos.length === 0) return [];
  const before = videos.length;
  const filtered = videos.filter(v => {
    const check = isExcludedContent(v);
    if (check.excluded) {
      console.log(`[TrendingData] ❌ "${(v.title || '').substring(0, 60)}" → ${check.reason}`);
      return false;
    }
    return true;
  });
  console.log(`[TrendingData] Filtro contenido: ${before} → ${filtered.length} videos`);
  return filtered;
}

// YouTube Shorts: hasta 3 minutos (YouTube extendió el límite en 2024)
const SHORTS_MAX_SECONDS = 180;

function filterLongVideosOnly(videos) {
  if (!videos || videos.length === 0) return [];
  const before = videos.length;
  const filtered = videos.filter(v => {
    const secs = parseDurationSeconds(v.duration);
    if (secs > 0 && secs <= SHORTS_MAX_SECONDS) {
      return false;
    }
    return true;
  });
  if (filtered.length < before) {
    console.log(`[TrendingData] Filtro long videos (>${SHORTS_MAX_SECONDS}s): ${before} → ${filtered.length}`);
  }
  return filtered;
}

function filterShortsOnly(videos) {
  if (!videos || videos.length === 0) return [];
  const before = videos.length;
  const filtered = videos.filter(v => {
    const secs = parseDurationSeconds(v.duration);
    return secs > 0 && secs <= SHORTS_MAX_SECONDS;
  });
  console.log(`[TrendingData] Filtro Shorts (1-${SHORTS_MAX_SECONDS}s): ${before} → ${filtered.length}`);
  return filtered;
}

module.exports = {
  filterExcludedContent,
  filterLongVideosOnly,
  filterShortsOnly,
  parseDurationSeconds,
  EXCLUDED_CATEGORY_IDS
};
