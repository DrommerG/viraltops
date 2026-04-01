/**
 * AGENTE: TITLE FILTER AGENT
 * Filtro determinista por palabras/caracteres en el título.
 * No usa IA — es 100% exacto y no tiene falsos negativos.
 *
 * Excluye cualquier video cuyo título contenga alguno de estos términos.
 */

// Términos prohibidos en el título (búsqueda case-insensitive)
const FORBIDDEN_TERMS = [
  'MV',
  'Teaser',
  'Trailer',
  'Tráiler',
  'Traíler',
  ' feat ',
  ' feat.',
  '(feat',
  '[feat',
  ' ft. ',
  ' ft.',
  '(ft.',
  '[ft.',
  'featuring',
  'Video Oficial',
  'Vídeo Oficial',
  'Official Video',
  'Music Video',
  'Video Musical',
  'Vídeo Musical',
  ' - ',        // Formato "Artista - Canción" (con espacios)
];

function titleContainsForbiddenTerm(title) {
  if (!title) return { found: false };
  for (const term of FORBIDDEN_TERMS) {
    if (title.toLowerCase().includes(term.toLowerCase())) {
      return { found: true, term };
    }
  }
  return { found: false };
}

function filterByTitle(videos) {
  if (!videos || videos.length === 0) return [];
  const before = videos.length;
  const filtered = videos.filter(v => {
    const check = titleContainsForbiddenTerm(v.title || '');
    if (check.found) {
      console.log(`[TitleFilter] ❌ "${(v.title || '').substring(0, 70)}" → contiene: "${check.term}"`);
      return false;
    }
    return true;
  });
  console.log(`[TitleFilter] Filtro título: ${before} → ${filtered.length} videos`);
  return filtered;
}

module.exports = { filterByTitle };
