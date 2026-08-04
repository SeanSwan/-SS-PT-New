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

const MAX_RECENT_SESSIONS = 6;

/**
 * Build the non-identifying terms used to help an audio provider recognize
 * exercise names and loads. No client identity belongs in this return value.
 */
export function buildFitnessBiasTerms({ vocabulary = getFitnessVocabFlat(), workoutLogs = [] } = {}) {
  const terms = new Set();
  for (const log of Array.isArray(workoutLogs) ? workoutLogs : []) {
    const exerciseName = String(log?.exerciseName ?? '').trim();
    if (exerciseName) terms.add(exerciseName);
    const weight = Number(log?.weight);
    if (Number.isFinite(weight) && weight > 0) terms.add(`${weight} pounds`);
  }
  for (const term of Array.isArray(vocabulary) ? vocabulary : []) {
    const normalized = String(term).trim();
    if (normalized) terms.add(normalized);
  }
  return [...terms];
}

/**
 * Resolve client-specific fitness hints without sending client identity to a
 * transcription provider. The returned name hints exist only for local PII
 * filtering inside voiceTranscriptionService.
 */
export async function getClientFitnessBias(clientId) {
  const fallback = { biasTerms: getFitnessVocabFlat(), piiNameHints: [] };
  const normalizedClientId = Number(clientId);
  if (!Number.isInteger(normalizedClientId) || normalizedClientId <= 0) return fallback;

  try {
    const models = await import('../models/index.mjs');
    const WorkoutSession = models.getWorkoutSession?.();
    const WorkoutLog = models.getWorkoutLog?.();
    const User = models.getUser?.();
    if (!WorkoutSession?.findAll || !WorkoutLog?.findAll) return fallback;

    const sessions = await WorkoutSession.findAll({
      where: { userId: normalizedClientId },
      attributes: ['id'],
      order: [['date', 'DESC']],
      limit: MAX_RECENT_SESSIONS,
      raw: true,
    });
    const sessionIds = sessions.map((session) => session.id).filter(Boolean);
    const workoutLogs = sessionIds.length > 0
      ? await WorkoutLog.findAll({
        where: { sessionId: sessionIds },
        attributes: ['exerciseName', 'weight'],
        raw: true,
      })
      : [];
    const client = User?.findByPk
      ? await User.findByPk(normalizedClientId, { attributes: ['firstName', 'lastName'], raw: true })
      : null;
    const piiNameHints = [client?.firstName, client?.lastName, [client?.firstName, client?.lastName].filter(Boolean).join(' ')]
      .filter(Boolean);
    return { biasTerms: buildFitnessBiasTerms({ workoutLogs }), piiNameHints };
  } catch {
    return fallback;
  }
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
