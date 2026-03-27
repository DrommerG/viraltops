/**
 * AGENTE 2: VIRAL ANALYZER
 * Analiza por qué los videos son virales usando OpenAI
 * y calcula el score de viralidad combinado
 */

const { analyzeVirality, analyzeSentiment } = require('../services/openaiService');
const { fetchVideoComments } = require('../services/youtubeService');

// Calculate raw virality score (before AI analysis)
function calculateViralityScore(video, maxViews, maxLikes) {
  const normViews = maxViews > 0 ? video.viewCount / maxViews : 0;
  const normLikes = maxLikes > 0 ? video.likeCount / maxLikes : 0;

  return (normViews * 0.60) + (normLikes * 0.40);
}

async function analyzeCategory(videos, topN = 20) {
  if (!videos || videos.length === 0) return [];

  // Calculate max values for normalization
  const maxViews = Math.max(...videos.map(v => v.viewCount));
  const maxLikes = Math.max(...videos.map(v => v.likeCount));

  // Score all videos
  const scored = videos.map(v => ({
    ...v,
    viralityScore: calculateViralityScore(v, maxViews, maxLikes)
  }));

  // Sort by virality score and take top N
  const top = scored.sort((a, b) => b.viralityScore - a.viralityScore).slice(0, topN);

  console.log(`[ViralAnalyzer] Analizando top ${top.length} videos con OpenAI...`);

  // Analyze top videos with OpenAI (limit to avoid token/cost overrun)
  const analyzed = [];
  for (let i = 0; i < top.length; i++) {
    const video = top[i];
    console.log(`[ViralAnalyzer] ${i + 1}/${top.length}: "${video.title.substring(0, 50)}"`);

    try {
      // Only fetch comments for top 5 to save API quota
      let sentimentScore = 0.7;
      if (i < 5) {
        const comments = await fetchVideoComments(video.id, 15);
        sentimentScore = await analyzeSentiment(comments);
        await new Promise(r => setTimeout(r, 200));
      }

      // Get AI virality analysis (for all top 15)
      const aiAnalysis = await analyzeVirality(video);
      await new Promise(r => setTimeout(r, 300));

      analyzed.push({
        ...video,
        rank: i + 1,
        sentimentScore,
        aiAnalysis,
        // Final combined score including sentiment
        finalScore: video.viralityScore * 0.9 + sentimentScore * 0.1
      });
    } catch (err) {
      console.error(`[ViralAnalyzer] Error analizando ${video.id}:`, err.message);
      analyzed.push({
        ...video,
        rank: i + 1,
        sentimentScore: 0.7,
        aiAnalysis: {
          porque_es_viral: 'Video altamente popular en su categoría.',
          patrones: ['Alto engagement', 'Contenido de calidad', 'Buen SEO', 'Audiencia fiel'],
          enganche_principal: 'Contenido relevante para su audiencia',
          consejo_creadores: 'Analiza qué hace único a este contenido y aplícalo en tus videos.',
          puntuacion_viralidad: 7
        },
        finalScore: video.viralityScore
      });
    }
  }

  return analyzed;
}

module.exports = { analyzeCategory };
