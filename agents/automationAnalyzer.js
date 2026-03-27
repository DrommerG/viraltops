/**
 * AGENTE 6: AUTOMATION ANALYZER
 * Analiza cada video y explica cómo automatizarlo o replicarlo
 * usando herramientas de IA y automatización disponibles hoy.
 */
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeAutomation(videoData) {
  const { title, channelTitle, description, tags, viewCount, likeCount } = videoData;

  try {
    const prompt = `Eres un experto en automatización de contenido digital y YouTube. Analiza este video y explica EXACTAMENTE cómo alguien podría automatizar o replicar este tipo de contenido usando herramientas actuales de IA.

DATOS DEL VIDEO:
- Título: ${title}
- Canal: ${channelTitle}
- Descripción: ${(description || '').substring(0, 200)}
- Tags: ${(tags || []).slice(0, 8).join(', ')}
- Vistas: ${Number(viewCount).toLocaleString()}
- Likes: ${Number(likeCount || 0).toLocaleString()}

Responde en JSON con este formato exacto:
{
  "tipo_contenido": "Descripción del tipo de video (ej: compilación, tutorial, reacción, animación, etc.)",
  "se_puede_automatizar": true,
  "nivel_dificultad": "Fácil / Medio / Difícil",
  "herramientas": ["herramienta 1", "herramienta 2", "herramienta 3"],
  "pasos": ["Paso 1: ...", "Paso 2: ...", "Paso 3: ...", "Paso 4: ..."],
  "tiempo_estimado": "Tiempo para producir 1 video de este tipo automatizado",
  "costo_estimado": "Costo aproximado mensual de las herramientas",
  "consejo_clave": "El consejo más importante para automatizar este tipo de contenido"
}`;

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 600,
      temperature: 0.7
    });

    return JSON.parse(res.choices[0].message.content);
  } catch (err) {
    console.error('AutomationAnalyzer error:', err.message);
    return {
      tipo_contenido: 'Contenido de video estándar',
      se_puede_automatizar: true,
      nivel_dificultad: 'Medio',
      herramientas: ['ChatGPT', 'ElevenLabs', 'CapCut', 'Canva'],
      pasos: [
        'Paso 1: Usar ChatGPT para generar el guión',
        'Paso 2: Generar voz con ElevenLabs',
        'Paso 3: Crear visuales con Canva o MidJourney',
        'Paso 4: Editar con CapCut automáticamente'
      ],
      tiempo_estimado: '1-2 horas por video',
      costo_estimado: '$30-50 USD/mes',
      consejo_clave: 'Crea una plantilla reutilizable para acelerar la producción.'
    };
  }
}

async function analyzeAutomationBatch(videos) {
  console.log(`[AutomationAnalyzer] Analizando automatización de ${videos.length} videos...`);
  const results = [];

  for (let i = 0; i < videos.length; i++) {
    console.log(`[AutomationAnalyzer] ${i + 1}/${videos.length}: "${videos[i].title?.substring(0, 50)}"`);
    const automation = await analyzeAutomation(videos[i]);
    results.push({ ...videos[i], automation });
    await new Promise(r => setTimeout(r, 300));
  }

  return results;
}

module.exports = { analyzeAutomationBatch };
