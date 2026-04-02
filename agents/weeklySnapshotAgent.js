/**
 * AGENTE: WEEKLY SNAPSHOT
 * Persiste el top semanal en GitHub Gist para que sobreviva reinicios de Render.
 * Sin esto, Render free tier pierde el cache cada vez que el servidor se duerme.
 */

const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIST_ID = process.env.GITHUB_GIST_ID;
const FILENAME = 'viraltops_cache.json';

function gistRequest(method, body = null) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: `/gists/${GIST_ID}`,
      method,
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'ViralTops',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({}); }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function loadSnapshot() {
  if (!GITHUB_TOKEN || !GIST_ID) {
    console.log('[Snapshot] Sin credenciales GitHub — saltando carga.');
    return null;
  }
  try {
    const gist = await gistRequest('GET');
    const content = gist.files?.[FILENAME]?.content;
    if (!content || content.trim() === '{}') return null;
    const data = JSON.parse(content);
    if (!data.weekKey || !data.categories) return null;
    console.log(`[Snapshot] Cache cargado desde Gist (weekKey: ${data.weekKey})`);
    return data;
  } catch (err) {
    console.error('[Snapshot] Error al cargar desde Gist:', err.message);
    return null;
  }
}

async function saveSnapshot(data) {
  if (!GITHUB_TOKEN || !GIST_ID) {
    console.log('[Snapshot] Sin credenciales GitHub — saltando guardado.');
    return;
  }
  try {
    await gistRequest('PATCH', {
      files: { [FILENAME]: { content: JSON.stringify(data) } }
    });
    console.log(`[Snapshot] Top semanal guardado en Gist (weekKey: ${data.weekKey})`);
  } catch (err) {
    console.error('[Snapshot] Error al guardar en Gist:', err.message);
  }
}

module.exports = { loadSnapshot, saveSnapshot };
