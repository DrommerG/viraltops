require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

const { loadCache, isStale, getNextRefreshDate } = require('./services/cacheService');
const { runPipeline, isPipelineRunning } = require('./agents/orchestrator');
const { CATEGORY_CONFIGS } = require('./services/youtubeService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ────────────────────────────────────────────────────────────────

// Get all category metadata (for sidebar)
app.get('/api/categories', (req, res) => {
  const categories = Object.entries(CATEGORY_CONFIGS).map(([key, cfg]) => ({
    key,
    name: cfg.name,
    icon: cfg.icon,
    color: cfg.color,
    description: cfg.description
  }));
  res.json({ categories });
});

// Get top 15 for a specific category
app.get('/api/tops/:category', async (req, res) => {
  const { category } = req.params;

  if (!CATEGORY_CONFIGS[category]) {
    return res.status(404).json({ error: 'Categoría no encontrada' });
  }

  let cache = loadCache();

  // If cache is stale and pipeline not running, trigger refresh
  if (isStale() && !isPipelineRunning()) {
    res.json({
      status: 'refreshing',
      message: 'Actualizando datos semanales, esto puede tomar unos minutos...',
      nextRefresh: getNextRefreshDate()
    });
    runPipeline().catch(console.error);
    return;
  }

  if (!cache.categories || !cache.categories[category]) {
    if (!isPipelineRunning()) {
      runPipeline().catch(console.error);
    }
    return res.json({
      status: 'loading',
      message: 'Cargando datos por primera vez...',
      nextRefresh: getNextRefreshDate()
    });
  }

  const categoryData = cache.categories[category];
  const videos = categoryData.videos || [];

  if (videos.length === 0) {
    return res.json({
      status: 'no_data',
      weekKey: cache.weekKey,
      updatedAt: cache.updatedAt,
      nextRefresh: getNextRefreshDate(),
      meta: categoryData.meta,
      videos: []
    });
  }

  res.json({
    status: 'ok',
    weekKey: cache.weekKey,
    updatedAt: cache.updatedAt,
    nextRefresh: getNextRefreshDate(),
    meta: categoryData.meta,
    videos
  });
});

// Get all tops at once (for initial load)
app.get('/api/tops', (req, res) => {
  const cache = loadCache();
  if (!cache.categories) {
    return res.json({ status: 'empty', categories: {} });
  }
  res.json({
    status: 'ok',
    weekKey: cache.weekKey,
    updatedAt: cache.updatedAt,
    nextRefresh: getNextRefreshDate(),
    categories: cache.categories
  });
});

// Force refresh (manual trigger)
app.post('/api/refresh', async (req, res) => {
  if (isPipelineRunning()) {
    return res.json({ status: 'already_running', message: 'El pipeline ya está en ejecución' });
  }
  res.json({ status: 'started', message: 'Pipeline de agentes iniciado' });
  runPipeline().catch(console.error);
});

// Pipeline status
app.get('/api/status', (req, res) => {
  const cache = loadCache();
  res.json({
    pipelineRunning: isPipelineRunning(),
    cacheWeekKey: cache.weekKey || null,
    isStale: isStale(),
    nextRefresh: getNextRefreshDate(),
    hasData: !!(cache.categories && Object.keys(cache.categories).length > 0)
  });
});

// ─── Weekly Cron Job (Every Monday at 00:00 UTC) ───────────────────────────────
cron.schedule('0 0 * * 1', () => {
  console.log('[Cron] Lunes - Iniciando actualización semanal de tops...');
  runPipeline().catch(console.error);
}, { timezone: 'UTC' });

// ─── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🎮 YouTube Top Videos Server corriendo en http://localhost:${PORT}`);
  console.log(`📅 Próxima actualización: ${new Date(getNextRefreshDate()).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`);

  // Auto-run pipeline if cache is stale or empty
  if (isStale()) {
    console.log('[Server] Cache desactualizado. Iniciando pipeline...');
    runPipeline().catch(console.error);
  } else {
    console.log('[Server] Cache actualizado. Datos listos.');
  }
});
