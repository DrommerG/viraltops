/* ═══════════════════════════════════════════════════════════════
   ViralTops — Frontend Application
   Lee datos desde /data/cache.json (archivo estático)
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────
  let currentCategory = 'espanol';
  let categories = [];
  let currentVideos = [];
  let allData = null;

  // ─── DOM Refs ──────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const sidebar        = $('sidebar');
  const sidebarNav     = $('sidebarNav');
  const sidebarToggle  = $('sidebarToggle');
  const menuBtn        = $('menuBtn');
  const loadingState   = $('loadingState');
  const errorState     = $('errorState');
  const videosGrid     = $('videosGrid');
  const modalOverlay   = $('modalOverlay');
  const modalClose     = $('modalClose');
  const modalPlayer    = $('modalPlayer');
  const nextRefreshDate = $('nextRefreshDate');
  const weekKey        = $('weekKey');
  const btnRetry       = $('btnRetry');

  // ─── Particles ──────────────────────────────────────────────
  function createParticles() {
    const container = $('particles');
    const colors = ['#7c3aed', '#06b6d4', '#f72585', '#ffd700', '#10b981'];
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 4 + 2;
      p.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${Math.random() * 100}%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-duration: ${Math.random() * 15 + 10}s;
        animation-delay: ${Math.random() * 10}s;
        box-shadow: 0 0 ${size * 3}px currentColor;
      `;
      container.appendChild(p);
    }
  }

  // ─── Sidebar ───────────────────────────────────────────────
  function buildSidebar(cats) {
    sidebarNav.innerHTML = `<div class="nav-section-title">Categorías</div>`;
    cats.forEach(cat => {
      const item = document.createElement('div');
      item.className = 'nav-item' + (cat.key === currentCategory ? ' active' : '');
      item.dataset.key = cat.key;
      item.style.setProperty('--item-color', cat.color);
      item.innerHTML = `
        <span class="nav-icon">${cat.icon}</span>
        <span class="nav-label">${cat.name}</span>
        <span class="nav-count">TOP 20</span>
      `;
      item.addEventListener('click', () => {
        selectCategory(cat.key);
        if (window.innerWidth <= 768) closeSidebar();
      });
      sidebarNav.appendChild(item);
    });
  }

  function selectCategory(key) {
    currentCategory = key;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.key === key);
    });
    showCategory(key);
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
  }

  function toggleSidebar() {
    sidebar.classList.toggle('open');
  }

  // ─── Hero Update ───────────────────────────────────────────
  function updateHero(cat) {
    $('heroIcon').textContent = cat.icon;
    $('heroTitle').textContent = cat.name;
    $('heroDesc').textContent = cat.description;
    $('topbarIcon').textContent = cat.icon;
    $('topbarName').textContent = cat.name;

    const glow = $('heroBgGlow');
    glow.style.background = cat.color;
    document.body.className = `theme-${cat.key}`;

    if (currentVideos.length > 0) {
      const totalViews = currentVideos.reduce((s, v) => s + (v.stats?.views || 0), 0);
      const totalLikes = currentVideos.reduce((s, v) => s + (v.stats?.likes || 0), 0);
      $('heroStats').innerHTML = `
        <div class="hero-stat">👁️ <strong>${formatNum(totalViews)}</strong> vistas totales</div>
        <div class="hero-stat">👍 <strong>${formatNum(totalLikes)}</strong> likes totales</div>
        <div class="hero-stat">🏆 <strong>${currentVideos.length}</strong> videos</div>
      `;
    }
  }

  // ─── Show Category (reads from local allData) ──────────────
  function showCategory(key) {
    const cat = categories.find(c => c.key === key);
    if (cat) updateHero(cat);

    showLoading();

    const catData = allData?.categories?.[key];
    if (!catData || !catData.videos || catData.videos.length === 0) {
      showError();
      return;
    }

    currentVideos = catData.videos;
    renderVideos(catData.videos, cat);
    if (allData.weekKey) weekKey.textContent = `Semana del ${allData.weekKey}`;
  }

  // ─── Render Videos ─────────────────────────────────────────
  function renderVideos(videos, cat) {
    videosGrid.innerHTML = '';
    videos.forEach(video => {
      const card = createVideoCard(video, cat);
      videosGrid.appendChild(card);
    });
    showVideos();
    if (cat) updateHero(cat);
  }

  function createVideoCard(video, cat) {
    const div = document.createElement('div');
    div.className = 'video-card';
    div.dataset.rank = video.rank;

    const rankClass = video.rank === 1 ? 'rank-1'
                    : video.rank === 2 ? 'rank-2'
                    : video.rank === 3 ? 'rank-3'
                    : 'rank-other';

    const viralPct = video.scores?.virality || 0;
    const color = cat?.color || '#7c3aed';

    div.innerHTML = `
      <div class="card-thumb">
        <img src="${escHtml(video.thumbnail)}" alt="${escHtml(video.title)}" loading="lazy"
             onerror="this.src='https://i.ytimg.com/vi/${video.id}/hqdefault.jpg'" />
        <div class="card-rank ${rankClass}">#${video.rank}</div>
        <div class="card-duration">${escHtml(video.duration || '')}</div>
        <div class="card-play-overlay">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      <div class="card-body">
        <div class="card-title">${escHtml(video.title)}</div>
        <div class="card-channel">${escHtml(video.channelTitle)}</div>
        <div class="card-stats">
          <div class="stat-item">
            <span class="stat-icon">👁️</span>
            <span class="stat-value">${video.stats?.viewsFormatted || '0'}</span>
            <span class="stat-label">Vistas</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">👍</span>
            <span class="stat-value">${video.stats?.likesFormatted || '0'}</span>
            <span class="stat-label">Likes</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">💬</span>
            <span class="stat-value">${video.stats?.commentsFormatted || '0'}</span>
            <span class="stat-label">Comentarios</span>
          </div>
        </div>
        <div class="virality-bar-wrap">
          <span class="virality-label">Viralidad</span>
          <div class="virality-bar">
            <div class="virality-fill" style="width: ${viralPct}%; background: linear-gradient(90deg, ${color}, #f72585)"></div>
          </div>
          <span class="virality-pct" style="color: ${color}">${viralPct}%</span>
        </div>
      </div>
    `;

    div.addEventListener('click', () => openModal(video, cat));
    return div;
  }

  // ─── Modal ─────────────────────────────────────────────────
  function openModal(video, cat) {
    const color = cat?.color || '#7c3aed';

    modalPlayer.src = video.urls?.embed || '';

    $('modalRank').textContent = `#${video.rank}`;
    $('modalRank').style.background = video.rank === 1 ? 'var(--color-gold)'
                                    : video.rank === 2 ? '#c0c0c0'
                                    : video.rank === 3 ? '#cd7f32'
                                    : color;
    $('modalRank').style.color = video.rank <= 3 ? '#000' : '#fff';

    $('modalTitle').textContent = video.title;
    $('modalChannel').textContent = video.channelTitle;
    $('modalChannel').href = video.urls?.channel || '#';

    $('modalStats').innerHTML = `
      <div class="modal-stat">
        <div class="modal-stat-icon">👁️</div>
        <div class="modal-stat-value">${video.stats?.viewsFormatted || '0'}</div>
        <div class="modal-stat-label">Visualizaciones</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-icon">👍</div>
        <div class="modal-stat-value">${video.stats?.likesFormatted || '0'}</div>
        <div class="modal-stat-label">Me gusta</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-icon">💬</div>
        <div class="modal-stat-value">${video.stats?.commentsFormatted || '0'}</div>
        <div class="modal-stat-label">Comentarios</div>
      </div>
    `;

    $('modalYtLink').href = video.urls?.watch || '#';

    const a = video.analysis || {};
    $('analysisWhyViral').textContent = a.porqueEsViral || 'Sin análisis disponible.';
    $('analysisHook').textContent = a.enganchePrincipal || 'Alto engagement con la audiencia.';
    $('analysisTip').textContent = a.consejoCreadores || 'Estudia los patrones de este video y aplícalos en tus propios contenidos.';

    const patternsList = $('analysisPatterns');
    patternsList.innerHTML = '';
    (a.patrones || []).forEach(p => {
      const li = document.createElement('li');
      li.textContent = p;
      patternsList.appendChild(li);
    });

    const s = video.scores || {};
    $('scoreMeters').innerHTML = `
      <div class="score-meter">
        <div class="score-meter-val" style="color: ${color}">${s.virality || 0}%</div>
        <div class="score-meter-label">Viralidad</div>
      </div>
      <div class="score-meter">
        <div class="score-meter-val" style="color: var(--color-green)">${s.sentiment || 70}%</div>
        <div class="score-meter-label">Sentimiento</div>
      </div>
      <div class="score-meter">
        <div class="score-meter-val" style="color: var(--color-gold)">${s.aiScore || 7}/10</div>
        <div class="score-meter-label">Score IA</div>
      </div>
    `;

    const auto = video.automation || {};
    $('autoMeta').innerHTML = `
      <span class="auto-badge" style="color:#ffa502;border-color:rgba(255,165,2,.4);background:rgba(255,165,2,.1)">${escHtml(auto.tipoContenido || 'Video')}</span>
      <span class="auto-badge" style="color:var(--color-green);border-color:rgba(16,185,129,.4);background:rgba(16,185,129,.1)">&#x23F1; ${escHtml(auto.tiempoEstimado || 'Variable')}</span>
      <span class="auto-badge" style="color:var(--color-cyan);border-color:rgba(6,182,212,.4);background:rgba(6,182,212,.1)">&#x1F4B0; ${escHtml(auto.costoEstimado || 'Variable')}</span>
      <span class="auto-badge" style="color:var(--color-pink);border-color:rgba(247,37,133,.4);background:rgba(247,37,133,.1)">${escHtml(auto.nivelDificultad || 'Medio')}</span>
    `;

    const steps = $('autoSteps');
    steps.innerHTML = '';
    (auto.pasos || []).forEach(p => {
      const li = document.createElement('li');
      li.textContent = p;
      steps.appendChild(li);
    });

    $('autoTools').innerHTML = (auto.herramientas || []).map(t => `<span class="tool-chip">${escHtml(t)}</span>`).join('');
    $('autoTip').textContent = auto.consejoClaveAuto || '';

    modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalPlayer.src = '';
    modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ─── UI States ─────────────────────────────────────────────
  function showLoading() {
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    videosGrid.classList.add('hidden');
  }

  function showVideos() {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    videosGrid.classList.remove('hidden');
  }

  function showError() {
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    videosGrid.classList.add('hidden');
  }

  // ─── Next refresh (computed client-side) ───────────────────
  function setNextRefreshLabel() {
    const now = new Date();
    const day = now.getUTCDay();
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(6, 0, 0, 0);
    nextRefreshDate.textContent = nextMonday.toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }

  // ─── Utils ─────────────────────────────────────────────────
  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatNum(n) {
    if (!n) return '0';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toString();
  }

  // ─── Events ────────────────────────────────────────────────
  sidebarToggle.addEventListener('click', closeSidebar);
  menuBtn.addEventListener('click', toggleSidebar);
  modalClose.addEventListener('click', closeModal);
  btnRetry.addEventListener('click', () => showCategory(currentCategory));

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // ─── Init ──────────────────────────────────────────────────
  async function init() {
    createParticles();
    setNextRefreshLabel();

    try {
      const res = await fetch('./data/cache.json');
      if (!res.ok) throw new Error('No data');
      const data = await res.json();

      if (!data.categories || Object.keys(data.categories).length === 0) {
        showError();
        return;
      }

      allData = data;

      // Build category list from the data itself
      categories = Object.entries(data.categories).map(([key, cat]) => ({
        key,
        name: cat.meta.name,
        icon: cat.meta.icon,
        color: cat.meta.color,
        description: cat.meta.description
      }));

      buildSidebar(categories);
      if (data.weekKey) weekKey.textContent = `Semana del ${data.weekKey}`;

      showCategory(currentCategory);

    } catch (err) {
      console.error('Init error:', err);
      showError();
    }
  }

  // ─── Run ───────────────────────────────────────────────────
  init();
})();
