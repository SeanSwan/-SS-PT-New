/**
 * Swan Coach Cortex runtime policy loader.
 * Reads the approved Obsidian brain vault as server-owned policy context and
 * converts readiness/tissue-quality doctrine into safe workout-builder signals.
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FOCUS_AREA_ALLOWLIST,
  READINESS_DESCRIPTOR_ALLOWLIST,
  READINESS_LEVELS,
} from './swanCoachCortexPolicyConfig.mjs';

const SERVICE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SERVICE_DIR, '..', '..');
const DEFAULT_VAULT_DIR = join(REPO_ROOT, 'docs', 'ai-workflow', 'coach-brain');

let cachedPolicy = null;
let cachedVaultDir = null;

function parseFrontmatter(content) {
  const text = String(content || '').replace(/^\uFEFF/, '');
  if (!text.startsWith('---')) return { frontmatter: {}, body: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { frontmatter: {}, body: text };

  const block = text.slice(3, end).trim();
  const frontmatter = {};
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    frontmatter[match[1].trim()] = match[2].trim();
  }
  return { frontmatter, body: text.slice(end + 4).trim() };
}

function excerpt(content, pattern, fallback = '') {
  const lines = String(content || '').split(/\r?\n/);
  const found = lines.find((line) => pattern.test(line));
  return (found || fallback).replace(/^[-#\s]+/, '').trim();
}

function cleanString(value, maxLength = 80) {
  if (typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s,./-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim();
}

function addUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

function containsToken(text, token) {
  const haystack = ` ${String(text || '').replace(/[^a-z0-9]+/g, ' ')} `;
  const needle = ` ${String(token || '').replace(/[^a-z0-9]+/g, ' ')} `.replace(/\s+/g, ' ');
  return haystack.includes(needle);
}

function safeReadinessField(value) {
  const cleaned = cleanString(value);
  if (!cleaned) return '';

  const matches = [];
  for (const area of [...FOCUS_AREA_ALLOWLIST].sort((a, b) => b.length - a.length)) {
    if (containsToken(cleaned, area)) addUnique(matches, area);
  }
  for (const descriptor of READINESS_DESCRIPTOR_ALLOWLIST) {
    if (containsToken(cleaned, descriptor)) addUnique(matches, descriptor);
  }
  return matches.slice(0, 8).join(', ');
}

function normalizeFocusAreas(values) {
  const raw = Array.isArray(values) ? values : [];
  const result = [];
  for (const value of raw) {
    const cleaned = cleanString(value, 32);
    if (!cleaned || !FOCUS_AREA_ALLOWLIST.has(cleaned)) continue;
    if (!result.includes(cleaned)) result.push(cleaned);
  }
  return result.slice(0, 8);
}

export function normalizeReadinessCheck(input = {}) {
  if (!input || typeof input !== 'object') {
    return {
      tightness: '',
      soreness: '',
      rangeOfMotion: '',
      recentHeavyTraining: false,
      redFlags: false,
      focusAreas: [],
    };
  }

  return {
    tightness: safeReadinessField(input.tightness),
    soreness: safeReadinessField(input.soreness),
    rangeOfMotion: safeReadinessField(input.rangeOfMotion),
    recentHeavyTraining: input.recentHeavyTraining === true,
    redFlags: input.redFlags === true,
    focusAreas: normalizeFocusAreas(input.focusAreas),
  };
}

export async function getSwanCoachCortexPolicy({ vaultDir = DEFAULT_VAULT_DIR, forceReload = false } = {}) {
  if (!forceReload && cachedPolicy && cachedVaultDir === vaultDir) return cachedPolicy;

  const entries = await readdir(vaultDir, { withFileTypes: true });
  const notes = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const content = await readFile(join(vaultDir, entry.name), 'utf8');
    const parsed = parseFrontmatter(content);
    if (parsed.frontmatter.brain !== 'swan_coach_cortex') continue;
    if (parsed.frontmatter.review_status !== 'approved') continue;
    notes.push({
      file: entry.name,
      domain: parsed.frontmatter.domain,
      content: parsed.body,
    });
  }

  notes.sort((a, b) => a.file.localeCompare(b.file));
  if (notes.length === 0) {
    throw new Error('No approved Swan Coach Cortex notes found');
  }

  const domains = notes.map((note) => note.domain).filter(Boolean);
  const joint = notes.find((note) => note.domain === 'joint_integrity_release');
  const privacy = notes.find((note) => note.domain === 'client_output_privacy');

  cachedPolicy = {
    source: 'swan_coach_cortex',
    reviewStatus: 'approved',
    vaultDir,
    notes,
    domains,
    readiness: {
      levels: READINESS_LEVELS,
      signals: ['tightness', 'soreness', 'range_of_motion', 'recent_heavy_training', 'tissue_quality'],
      doctrine: excerpt(joint?.content, /Minor Tightness|Range Of Motion|Full-Spectrum/i),
      candidateScoring: [
        'Prefer controlled range, clean positions, and release/prep when tissue quality limits the session.',
        'Avoid aggressive failure work when readiness is Yellow or Red.',
        'Stop provocative work and refer out when Red flags are present.',
      ],
      clientSafeLanguage: excerpt(
        privacy?.content,
        /Based on your training background|current movement needs/i,
        'Based on your training background, this plan supports your current movement needs while keeping the goal in focus.',
      ),
    },
  };
  cachedVaultDir = vaultDir;
  return cachedPolicy;
}

function hasLimitedRange(value) {
  return /limited|tight|restricted|stiff|poor|reduced/.test(String(value || '').toLowerCase());
}

function readinessSignals({ normalized, clientContext }) {
  const signals = [];
  if (normalized.tightness) signals.push(`tightness: ${normalized.tightness}`);
  if (normalized.soreness) signals.push(`soreness: ${normalized.soreness}`);
  if (normalized.rangeOfMotion) signals.push(`range of motion: ${normalized.rangeOfMotion}`);
  if (normalized.recentHeavyTraining) signals.push('recent heavy training');
  for (const area of normalized.focusAreas) signals.push(`focus area: ${area}`);

  const painWarnings = clientContext?.pain?.warnings || [];
  const painExclusions = clientContext?.pain?.exclusions || [];
  if (painWarnings.length > 0) signals.push(`${painWarnings.length} pain warning area(s)`);
  if (painExclusions.length > 0) signals.push(`${painExclusions.length} pain exclusion area(s)`);
  if ((clientContext?.movement?.compensations || []).length > 0) signals.push('movement compensation context');
  if (Number(clientContext?.workouts?.avgFormRating) > 0 && Number(clientContext.workouts.avgFormRating) < 3.5) {
    signals.push('form quality needs review');
  }
  return signals;
}

function classifyReadiness({ normalized, clientContext }) {
  if (normalized.redFlags) return 'red';
  if ((clientContext?.pain?.exclusions || []).length > 0) return 'yellow';
  if ((clientContext?.pain?.warnings || []).length > 0) return 'yellow';
  if (normalized.tightness || normalized.soreness || hasLimitedRange(normalized.rangeOfMotion)) return 'yellow';
  if (normalized.recentHeavyTraining) return 'yellow';
  if ((clientContext?.movement?.compensations || []).length > 0) return 'yellow';
  return 'green';
}

export async function buildSwanCoachReadinessContext({
  clientContext = {},
  readinessCheck = {},
  category = 'full_body',
  primaryGoal = 'general_fitness',
} = {}) {
  const policy = await getSwanCoachCortexPolicy();
  const normalized = normalizeReadinessCheck(readinessCheck);
  const signals = readinessSignals({ normalized, clientContext });
  const level = classifyReadiness({ normalized, clientContext });
  const levelMeta = READINESS_LEVELS.find((entry) => entry.level === level) || READINESS_LEVELS[0];
  const focus = normalized.focusAreas.length > 0 ? normalized.focusAreas.join(', ') : category;

  return {
    source: policy.source,
    reviewStatus: policy.reviewStatus,
    level,
    label: levelMeta.label,
    primaryGoal,
    category,
    signals,
    normalizedCheck: normalized,
    constraints: {
      avoidAggressiveIntensity: level !== 'green',
      preferControlledRange: level !== 'green' || hasLimitedRange(normalized.rangeOfMotion),
      requireTrainerReview: level !== 'green',
      requireReferralOrClearance: level === 'red',
    },
    trainerNote: level === 'green'
      ? 'Readiness is Green: keep normal warmup, release, rolling, and form checks while training the goal.'
      : `Readiness is ${levelMeta.label}: review ${focus}, use release/rolling and controlled range of motion, reduce provocative loading, and keep the goal in focus.`,
    clientSafeNote: policy.readiness.clientSafeLanguage,
    candidateScoring: policy.readiness.candidateScoring,
  };
}

export function buildSwanCoachReadinessExplanation(readiness) {
  return {
    type: 'swan_coach_readiness',
    message: `Swan Coach readiness: ${readiness.label}. ${readiness.trainerNote}`,
    details: readiness.signals,
  };
}

export function buildSwanCoachReadinessRationaleLine(readiness) {
  return `Readiness: ${readiness.level}. ${readiness.trainerNote}`;
}

export function buildSwanCoachReadinessRecommendationDetail(readiness) {
  return {
    type: 'swan_coach_readiness',
    text: `${readiness.label}: ${readiness.trainerNote}`,
    sourceCitation: 'context.swanCoachReadiness',
  };
}

export function scoreExerciseForSwanCoachReadiness(exercise = {}, readiness = null) {
  if (!readiness || readiness.level === 'green') return 0;
  const labels = [
    exercise.key,
    exercise.name,
    exercise.exerciseName,
    exercise.category,
    exercise.movementPattern,
    ...(Array.isArray(exercise.muscles) ? exercise.muscles : []),
  ].filter(Boolean).join(' ').toLowerCase();

  let score = 0;
  if (/corrective|stability|mobility|flexibility|balance|core/.test(labels)) score += 3;
  if ((exercise.nasmLevel || 2) <= 2) score += 2;
  for (const area of readiness.normalizedCheck.focusAreas || []) {
    if (labels.includes(area)) score -= 1;
  }
  if (/jump|plyo|power|explosive|max/.test(labels)) score -= 3;
  return score;
}

export function applySwanCoachReadinessToExercises(exercises = [], readiness = null) {
  if (!readiness || readiness.level === 'green') return exercises;
  return exercises.map((exercise) => {
    const next = { ...exercise };
    if (readiness.constraints.avoidAggressiveIntensity && next.intensityMethod) {
      delete next.intensityMethod;
      next.readinessIntensityGuardrail = 'Intensity method reduced because readiness is not Green.';
    }
    next.readinessNote = 'Use release/rolling as needed, controlled range of motion, and stop if symptoms escalate.';
    return next;
  });
}
