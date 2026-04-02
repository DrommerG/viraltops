/**
 * AGENTE ORQUESTADOR
 * Coordina el pipeline completo:
 * 1. VideoCollector          → recolecta videos (chart + búsqueda) y filtra música/trailers/series
 * 2. ChannelFilterAgent      → filtra canales con 30M+ suscriptores
 * 3. ContentValidator        → filtra por idioma (defaultAudioLanguage + OpenAI)
 * 4. ViralQualityAgent       → filtra vistas mínimas y rankea por calidad viral
 * 5. DeepViralResearchAgent  → rankea por velocidad de vistas + engagement real
 * 6. ViralAnalyzer           → analiza viralidad con OpenAI
 * 7. AutomationAnalyzer      → explica cómo automatizar cada video
 * 8. DataStructurer          → estructura y guarda en caché
 * 9. WeeklySnapshotAgent     → persiste el top en GitHub Gist (sobrevive reinicios de Render)
 */

const videoCollector = require('./videoCollector');
const { filterMegaChannels } = require('./channelFilterAgent');
const { validateAllCategories } = require('./contentValidator');
const { filterAndRankByQuality } = require('./viralQualityAgent');
const { researchDeepVirality } = require('./deepViralResearchAgent');
const { analyzeCategory } = require('./viralAnalyzer');
const { analyzeAutomationBatch } = require('./automationAnalyzer');
const dataStructurer = require('./dataStructurer');
const { saveSnapshot } = require('./weeklySnapshotAgent');
const { CATEGORY_CONFIGS } = require('../services/youtubeService');

let isRunning = false;
let lastFailedAt = null;
const RETRY_DELAY_MS = 5 * 60 * 1000;

async function runPipeline() {
  if (isRunning) {
    console.log('[Orchestrator] Pipeline ya en ejecución.');
    return null;
  }

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

    // AGENTE 1: Recolectar videos + filtrar música/trailers/series
    console.log('\n--- AGENTE 1: VideoCollector + TrendingData ---');
    const rawData = await videoCollector.run(categoryKeys);

    // AGENTE 2: Filtrar mega-canales (30M+ suscriptores)
    console.log('\n--- AGENTE 2: ChannelFilterAgent ---');
    const channelFilteredData = {};
    for (const key of categoryKeys) {
      const videos = rawData[key] || [];
      channelFilteredData[key] = await filterMegaChannels(videos);
      await new Promise(r => setTimeout(r, 300));
    }

    // AGENTE 3: Filtrar por idioma
    console.log('\n--- AGENTE 3: ContentValidator ---');
    const validatedData = await validateAllCategories(channelFilteredData);

    // AGENTE 4: Filtrar por calidad viral (vistas mínimas + ranking)
    console.log('\n--- AGENTE 4: ViralQualityAgent ---');
    const qualityData = {};
    for (const key of categoryKeys) {
      const videos = validatedData[key] || [];
      qualityData[key] = filterAndRankByQuality(videos, key);
    }

    // AGENTE 5: Investigación viral profunda (velocidad de vistas + engagement)
    console.log('\n--- AGENTE 5: DeepViralResearchAgent ---');
    const deepData = {};
    for (const key of categoryKeys) {
      const videos = qualityData[key] || [];
      deepData[key] = researchDeepVirality(videos, 40);
    }

    // AGENTE 6: Analizar viralidad con OpenAI
    console.log('\n--- AGENTE 6: ViralAnalyzer ---');
    const analyzedData = {};
    for (const key of categoryKeys) {
      const videos = deepData[key] || [];
      if (videos.length > 0) {
        console.log(`[ViralAnalyzer] ${key}: ${videos.length} videos`);
        analyzedData[key] = await analyzeCategory(videos, 20);
        await new Promise(r => setTimeout(r, 500));
      } else {
        console.warn(`[ViralAnalyzer] ${key}: 0 videos, saltando...`);
        analyzedData[key] = [];
      }
    }

    // AGENTE 7: Analizar automatización
    console.log('\n--- AGENTE 7: AutomationAnalyzer ---');
    const finalData = {};
    for (const key of categoryKeys) {
      if (analyzedData[key] && analyzedData[key].length > 0) {
        finalData[key] = await analyzeAutomationBatch(analyzedData[key]);
        await new Promise(r => setTimeout(r, 400));
      } else {
        finalData[key] = analyzedData[key] || [];
      }
    }

    // AGENTE 8: Estructurar y guardar en caché local
    console.log('\n--- AGENTE 8: DataStructurer ---');
    const result = dataStructurer.run(finalData);

    // AGENTE 9: Persistir en GitHub Gist (sobrevive reinicios de Render)
    // Solo guardar si todas las categorías tienen al menos 5 videos (evita guardar resultados parciales)
    console.log('\n--- AGENTE 9: WeeklySnapshotAgent ---');
    if (result && result.weekKey && result.categories) {
      const allCatsHaveVideos = Object.values(result.categories)
        .every(cat => (cat?.videos?.length || 0) >= 5);
      if (allCatsHaveVideos) {
        await saveSnapshot(result);
      } else {
        const counts = Object.entries(result.categories)
          .map(([k, v]) => `${k}:${v?.videos?.length || 0}`)
          .join(', ');
        console.warn(`[WeeklySnapshot] Resultado incompleto (${counts}), no se guardó en Gist.`);
      }
    }

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
