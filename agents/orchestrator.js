/**
 * AGENTE ORQUESTADOR
 * Coordina el pipeline completo:
 * 1. VideoCollector      → recolecta videos (chart + búsqueda con filtro de fecha)
 * 2. ContentValidator    → filtra por idioma
 * 3. ViralAnalyzer       → analiza viralidad con OpenAI
 * 4. AutomationAnalyzer  → explica cómo automatizar cada video
 * 5. DataStructurer      → estructura y guarda en caché
 */

const videoCollector = require('./videoCollector');
const { validateAllCategories } = require('./contentValidator');
const { analyzeCategory } = require('./viralAnalyzer');
const { analyzeAutomationBatch } = require('./automationAnalyzer');
const dataStructurer = require('./dataStructurer');
const { CATEGORY_CONFIGS } = require('../services/youtubeService');

let isRunning = false;
let lastFailedAt = null;
const RETRY_DELAY_MS = 5 * 60 * 1000; // 5 min cooldown after failure

async function runPipeline() {
  if (isRunning) {
    console.log('[Orchestrator] Pipeline ya en ejecución.');
    return null;
  }

  // Avoid rapid retries after failure
  if (lastFailedAt && (Date.now() - lastFailedAt) < RETRY_DELAY_MS) {
    const wait = Math.round((RETRY_DELAY_MS - (Date.now() - lastFailedAt)) / 1000);
    console.log(`[Orchestrator] Falló recientemente. Esperar ${wait}s antes de reintentar.`);
    return null;
  }

  isRunning = true;
  const startTime = Date.now();
  console.log('\n=== [Orchestrator] INICIANDO PIPELINE ===');
  console.log(`Fecha: ${new Date().toISOString()}`);

  try {
    const categoryKeys = Object.keys(CATEGORY_CONFIGS);
    console.log(`[Orchestrator] Categorías: ${categoryKeys.join(', ')}`);

    // AGENTE 1: Recolectar videos (hybrid: chart + búsqueda)
    console.log('\n--- AGENTE 1: VideoCollector ---');
    const rawData = await videoCollector.run(categoryKeys);

    // AGENTE 2: Filtrar por idioma
    console.log('\n--- AGENTE 2: ContentValidator ---');
    const validatedData = await validateAllCategories(rawData);

    // AGENTE 3: Analizar viralidad
    console.log('\n--- AGENTE 3: ViralAnalyzer ---');
    const analyzedData = {};
    for (const key of categoryKeys) {
      const videos = validatedData[key] || [];
      if (videos.length > 0) {
        console.log(`[ViralAnalyzer] ${key}: ${videos.length} videos`);
        analyzedData[key] = await analyzeCategory(videos, 20);
        await new Promise(r => setTimeout(r, 500));
      } else {
        console.warn(`[ViralAnalyzer] ${key}: 0 videos, saltando...`);
        analyzedData[key] = [];
      }
    }

    // AGENTE 4: Analizar automatización
    console.log('\n--- AGENTE 4: AutomationAnalyzer ---');
    const finalData = {};
    for (const key of categoryKeys) {
      if (analyzedData[key] && analyzedData[key].length > 0) {
        finalData[key] = await analyzeAutomationBatch(analyzedData[key]);
        await new Promise(r => setTimeout(r, 400));
      } else {
        finalData[key] = analyzedData[key] || [];
      }
    }

    // AGENTE 5: Estructurar y guardar
    console.log('\n--- AGENTE 5: DataStructurer ---');
    const result = dataStructurer.run(finalData);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== [Orchestrator] PIPELINE COMPLETADO en ${elapsed}s ===\n`);

    lastFailedAt = null;
    return result;

  } catch (err) {
    lastFailedAt = Date.now();
    console.error('[Orchestrator] Error en pipeline:', err.message);
    throw err;
  } finally {
    isRunning = false;
  }
}

function isPipelineRunning() { return isRunning; }

module.exports = { runPipeline, isPipelineRunning };
