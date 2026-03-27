require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

const { loadCache, isStale, getNextRefreshDate } = require('./services/cacheService');
const { runPipeline, isPipelineRunning } = require('./agents/orchestrator');
const { CATEGORY_CONFIGS } = require('./services/youtubeService');

// ─── Crash protection ──────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception (recovered):', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection (recovered):', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ────────────────────────────────────────────────────────────────

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

app.get('/api/tops/:category', async (req, res) => {
  const { category } = req.params;

  if (!CATEGORY_CONFIGS[category]) {
    return res.status(404).json({ error: 'Categoría no encontrada' });
  }

  const cache = loadCache();

  // Stale data → trigger refresh in background
  if (isStale() && !isPipelineRunning()) {
    runPipeline().catch(err => console.error('[Server] Pipeline error:', err.message));
    return res.json({
      status: 'refreshing',
      message: 'Actualizando datos semanales (~3-4 minutos)...',
      nextRefresh: getNextRefreshDate()
    });
  }

  // Pipeline running → let client poll
  if (!cache.categories || !cache.categories[category]) {
    if (!isPipelineRunning()) {
      runPipeline().catch(err => console.error('[Server] Pipeline error:', err.message));
    }
    return res.json({
      status: 'loading',
      message: 'Cargando datos por primera vez...',
      nextRefresh: getNextRefreshDate()
    });
  }

  const categoryData = cache.categories[category];
  const videos = categoryData.videos || [];

  res.json({
    status: videos.length > 0 ? 'ok' : 'no_data',
    weekKey: cache.weekKey,
    updatedAt: cache.updatedAt,
    nextRefresh: getNextRefreshDate(),
    meta: categoryData.meta,
    videos
  });
});

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

app.post('/api/refresh', async (req, res) => {
  if (isPipelineRunning()) {
    return res.json({ status: 'already_running' });
  }
  res.json({ status: 'started' });
  runPipeline().catch(err => console.error('[Server] Pipeline error:', err.message));
});

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

// Health check for Render
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ─── Weekly Cron (Every Monday at 6:00 UTC) ────────────────────────────────────
cron.schedule('0 6 * * 1', () => {
  console.log('[Cron] Lunes — Iniciando actualización semanal...');
  runPipeline().catch(err => console.error('[Cron] Pipeline error:', err.message));
}, { timezone: 'UTC' });

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🎮 ViralTops corriendo en puerto ${PORT}`);
  console.log(`📅 Próxima actualización: ${new Date(getNextRefreshDate()).toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })}\n`);

  if (isStale()) {
    console.log('[Server] Cache desactualizado. Iniciando pipeline...');
    runPipeline().catch(err => console.error('[Server] Startup pipeline error:', err.message));
  } else {
    console.log('[Server] Cache actualizado. Datos listos.');
  }
});
