/**
 * fitnessTranscriptionVocabService.mjs
 * =====================================
 * Loads the static SwanStudios fitness vocabulary and exposes it as a
 * flat de-duplicated list for biasing transcription prompts.
 *
 * Phase 3 Slice 3.7 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §15.
 *
 * PLAUD Pro feature parity: PLAUD app supports custom vocabulary upload
 * for industry-specific terms. Phase 3 ships a static SwanStudios fitness
 * vocab JSON. Phase 3.x adds user-uploadable vocab (deferred).
 *
 * Public API:
 *   getFitnessVocabFlat() -> string[]   // ~200 deduped lowercase terms
 *   getFitnessVocabBiasPrompt() -> string   // pre-formatted prompt segment
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const VOCAB_PATH = join(__dirname, 'plaud-data', 'plaud-fitness-vocab.json');

let _vocabCache = null;

function loadRawVocab() {
  if (_vocabCache) return _vocabCache;
  const raw = JSON.parse(readFileSync(VOCAB_PATH, 'utf8'));
  _vocabCache = raw;
  return _vocabCache;
}

export function getFitnessVocabFlat() {
  const raw = loadRawVocab();
  const all = new Set();
  for (const cat of Object.values(raw.categories || {})) {
    if (!Array.isArray(cat)) continue;
    for (const term of cat) {
      const normalized = String(term).trim().toLowerCase();
      if (normalized) all.add(normalized);
    }
  }
  return Array.from(all);
}

export function getFitnessVocabBiasPrompt() {
  const flat = getFitnessVocabFlat();
  if (flat.length === 0) return '';
  return [
    'Domain vocabulary hints (NASM CPT / personal training / anatomy):',
    flat.join(', '),
  ].join('\n');
}

export function getFitnessVocabVersion() {
  return loadRawVocab().version || 1;
}
