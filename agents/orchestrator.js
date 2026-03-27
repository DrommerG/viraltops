/**
 * AGENTE ORQUESTADOR
 * Coordina todo el pipeline de agentes:
 * 1. VideoCollector      → recolecta videos por categoría
 * 2. ContentValidator    → valida que los videos pertenecen a su categoría
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

async function runPipeline() {
  if (isRunning) {
    console.log('[Orchestrator] Pipeline ya en ejecución, saltando...');
    return null;
  }

  isRunning = true;
  const startTime = Date.now();
  console.log('\n=== [Orchestrator] INICIANDO PIPELINE DE AGENTES ===');
  console.log(`Fecha: ${new Date().toISOString()}`);

  try {
    const categoryKeys = Object.keys(CATEGORY_CONFIGS);
    console.log(`[Orchestrator] Categorías a procesar: ${categoryKeys.join(', ')}`);

    // AGENTE 1: Recolectar videos
    console.log('\n--- AGENTE 1: VideoCollector ---');
    const rawData = await videoCollector.run(categoryKeys);

    // AGENTE 4+5: CategoryResearcher + ContentValidator
    console.log('\n--- AGENTE 4+5: CategoryResearcher + ContentValidator ---');
    const validatedData = await validateAllCategories(rawData);

    // AGENTE 2: Analizar viralidad por categoría
    console.log('\n--- AGENTE 2: ViralAnalyzer ---');
    const analyzedData = {};
    for (const key of categoryKeys) {
      const videos = validatedData[key] || [];
      if (videos.length > 0) {
        console.log(`[ViralAnalyzer] Procesando categoría: ${key} (${videos.length} videos)`);
        analyzedData[key] = await analyzeCategory(videos, 20);
        // Pause between categories to avoid OpenAI rate limits
        await new Promise(r => setTimeout(r, 500));
      } else {
        analyzedData[key] = [];
      }
    }

    // AGENTE 6: Analizar automatización de cada video
    console.log('\n--- AGENTE 6: AutomationAnalyzer ---');
    const finalData = {};
    for (const key of categoryKeys) {
      if (analyzedData[key] && analyzedData[key].length > 0) {
        finalData[key] = await analyzeAutomationBatch(analyzedData[key]);
        await new Promise(r => setTimeout(r, 400));
      } else {
        finalData[key] = analyzedData[key] || [];
      }
    }

    // AGENTE 3: Estructurar y guardar datos
    console.log('\n--- AGENTE 3: DataStructurer ---');
    const result = dataStructurer.run(finalData);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== [Orchestrator] PIPELINE COMPLETADO en ${elapsed}s ===\n`);

    return result;
  } catch (err) {
    console.error('[Orchestrator] Error en pipeline:', err);
    throw err;
  } finally {
    isRunning = false;
  }
}

function isPipelineRunning() {
  return isRunning;
}

module.exports = { runPipeline, isPipelineRunning };
