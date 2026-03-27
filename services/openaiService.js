const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Analyze why a video is viral and identify patterns
async function analyzeVirality(videoData) {
  const { title, channelTitle, viewCount, likeCount, commentCount, description, tags } = videoData;

  try {
    const prompt = `Eres un experto en marketing digital y viralidad en YouTube. Analiza este video y explica en español por qué es viral.

DATOS DEL VIDEO:
- Título: ${title}
- Canal: ${channelTitle}
- Vistas: ${Number(viewCount).toLocaleString()}
- Likes: ${Number(likeCount || 0).toLocaleString()}
- Comentarios: ${Number(commentCount || 0).toLocaleString()}
- Descripción: ${(description || '').substring(0, 300)}
- Tags: ${(tags || []).slice(0, 10).join(', ')}

Responde en JSON con este formato exacto:
{
  "porque_es_viral": "Explicación breve de 2-3 oraciones de por qué este video es viral",
  "patrones": ["patrón 1", "patrón 2", "patrón 3", "patrón 4"],
  "enganche_principal": "El elemento más importante que engancha al espectador",
  "consejo_creadores": "Un consejo práctico para que otros creadores apliquen estos patrones",
  "puntuacion_viralidad": 8
}

El campo "puntuacion_viralidad" es un número del 1 al 10.`;

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.7
    });

    return JSON.parse(res.choices[0].message.content);
  } catch (err) {
    console.error('OpenAI analyzeVirality error:', err.message);
    return {
      porque_es_viral: 'Video con alto engagement y contenido relevante para su audiencia.',
      patrones: ['Contenido de alta calidad', 'Título llamativo', 'Miniatura atractiva', 'Buen timing'],
      enganche_principal: 'Contenido relevante y de alta calidad',
      consejo_creadores: 'Enfócate en la calidad del contenido y el valor que aportas a tu audiencia.',
      puntuacion_viralidad: 7
    };
  }
}

// Analyze sentiment of comments
async function analyzeSentiment(comments) {
  if (!comments || comments.length === 0) return 0.5;

  try {
    const sampleComments = comments.slice(0, 15).join('\n');
    const prompt = `Analiza el sentimiento de estos comentarios de YouTube y responde SOLO con un número decimal entre 0.0 y 1.0 donde 0 = muy negativo, 0.5 = neutro, 1.0 = muy positivo:

${sampleComments}

Responde SOLO con el número, sin texto adicional.`;

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10,
      temperature: 0
    });

    const score = parseFloat(res.choices[0].message.content.trim());
    return isNaN(score) ? 0.5 : Math.min(1, Math.max(0, score));
  } catch (err) {
    console.error('OpenAI analyzeSentiment error:', err.message);
    return 0.5;
  }
}

module.exports = { analyzeVirality, analyzeSentiment };
