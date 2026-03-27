/**
 * Standalone pipeline runner — used by GitHub Actions every Monday.
 * Generates public/data/cache.json with fresh video data.
 */
require('dotenv').config();
const { runPipeline } = require('../agents/orchestrator');

async function main() {
  console.log('[generate-data] Starting ViralTops pipeline...');
  await runPipeline();
  console.log('[generate-data] Done. Data saved to public/data/cache.json');
}

main().catch(err => {
  console.error('[generate-data] Fatal error:', err);
  process.exit(1);
});
