/**
 * De-Identification Layer — Client PII Stripping
 * ================================================
 * Transforms raw client data into de-identified form before sending to cloud AI.
 * PII is NEVER sent to AI models. Re-hydration happens server-side in response.
 *
 * Pipeline position: ... → ClientResolver → **DeIdentifier** → AI Model → ReHydrator
 *
 * V3 Privacy Architecture:
 * - Client names → "Client-{id}"
 * - Emails, phones → [REDACTED]
 * - Pain details → abstracted levels (low/medium/high)
 * - Medications → [REDACTED]
 * - Exercise names, goals, NASM phase → KEPT (non-PII)
 */
import logger from '../../utils/logger.mjs';
import { scanForPHI, stripPHI } from './phiScanner.mjs';

// ── Pain Level Abstraction ──────────────────────────────────────────────────

/**
 * Convert numeric 1-10 pain to category.
 * @param {number} level
 * @returns {'none'|'low'|'medium'|'high'}
 */
function abstractPainLevel(level) {
  if (!level || level <= 0) return 'none';
  if (level <= 3) return 'low';
  if (level <= 6) return 'medium';
  return 'high';
}

// ── De-Identification Transform ─────────────────────────────────────────────

/**
 * De-identify a client record for AI consumption.
 * Returns a safe data object + an alias map for re-hydration.
 *
 * @param {Object} client - Full client record from database
 * @param {Object} [enrichment] - Additional data (pain entries, macros, measurements, etc.)
 * @returns {{ deIdentified: Object, aliasMap: Record<string, string> }}
 */
export function deIdentifyClient(client, enrichment = {}) {
  if (!client || !client.id) {
    throw new Error('deIdentifyClient: client with id is required');
  }

  const alias = `Client-${client.id}`;
  const aliasMap = {};

  // Name fragments to alias out of any free text before it reaches a model. Includes the joined
  // full name so "Sarah Connor" is replaced as one unit before the bare "Sarah" can match inside it.
  const nameParts = [
    [client.firstName, client.lastName].filter(Boolean).join(' '),
    client.firstName,
    client.lastName
  ].filter(Boolean);

  // Map real name → alias
  const fullName = [client.firstName, client.lastName].filter(Boolean).join(' ');
  if (fullName) aliasMap[alias] = fullName;
  if (client.firstName) aliasMap[`Client-${client.id}`] = fullName || client.firstName;

  // Build de-identified payload
  const deIdentified = {
    clientAlias: alias,
    age: client.age || calculateAge(client.dateOfBirth) || null,
    gender: client.gender || null,
    fitnessGoals: extractGoals(client, enrichment, nameParts, alias),
    trainingExperience: client.trainingExperience || null,
    nasmPhase: client.nasmPhase || enrichment.nasmPhase || null,
    clientSource: client.clientSource || null,
    isActive: client.isActive !== false,

    // Pain — abstracted (no specific diagnoses)
    painEntries: deIdentifyPainEntries(enrichment.painEntries),

    // Exercise history — names only (non-PII)
    recentExercises: extractRecentExercises(enrichment.workouts),

    // Macro averages — aggregated (non-PII)
    macroAverages: calculateMacroAverages(enrichment.macroLogs),

    // Measurement trends — direction only (non-PII)
    measurementTrends: calculateMeasurementTrend(enrichment.measurements),

    // NASM progress levels (non-PII)
    progressLevels: enrichment.progressLevels || null,

    // Goals (non-PII goal descriptions)
    goals: deIdentifyGoals(enrichment.goals, nameParts, alias),

    // EXCLUDED from AI: name, email, phone, address, SSN, insurance, medications, specific diagnoses
  };

  return { deIdentified, aliasMap };
}

/**
 * De-identify pain entries — abstract to body part + level category only.
 * @param {Array} painEntries
 * @returns {Array}
 */
function deIdentifyPainEntries(painEntries) {
  if (!painEntries || !Array.isArray(painEntries)) return [];
  return painEntries.slice(0, 10).map(entry => ({
    bodyPart: entry.bodyPart || entry.area || 'unknown',
    level: abstractPainLevel(entry.painLevel || entry.level),
    isActive: entry.isActive !== false,
    // EXCLUDED: specific injury names, diagnoses, doctor notes
  }));
}

/**
 * Extract recent exercise names from workout history.
 * @param {Array} workouts
 * @returns {string[]}
 */
function extractRecentExercises(workouts) {
  if (!workouts || !Array.isArray(workouts)) return [];
  const exercises = new Set();
  // Last 5 sessions, extract exercise names
  for (const workout of workouts.slice(0, 5)) {
    const exerciseList = workout.exercises || workout.data?.exercises || [];
    for (const ex of exerciseList) {
      if (ex.name || ex.exerciseName) {
        exercises.add(ex.name || ex.exerciseName);
      }
    }
  }
  return [...exercises].slice(0, 30);
}

/**
 * Calculate average macros from recent logs.
 * @param {Array} macroLogs
 * @returns {Object|null}
 */
function calculateMacroAverages(macroLogs) {
  if (!macroLogs || !Array.isArray(macroLogs) || macroLogs.length === 0) return null;
  const recent = macroLogs.slice(0, 7); // Last 7 days
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const log of recent) {
    totals.calories += log.calories || 0;
    totals.protein += log.protein || 0;
    totals.carbs += log.carbs || 0;
    totals.fat += log.fat || 0;
  }
  const count = recent.length;
  return {
    calories: Math.round(totals.calories / count),
    protein: Math.round(totals.protein / count),
    carbs: Math.round(totals.carbs / count),
    fat: Math.round(totals.fat / count),
    sampleDays: count,
  };
}

/**
 * Determine measurement trend direction.
 * @param {Array} measurements
 * @returns {'improving'|'stable'|'declining'|null}
 */
function calculateMeasurementTrend(measurements) {
  if (!measurements || !Array.isArray(measurements) || measurements.length < 2) return null;
  const sorted = [...measurements].sort((a, b) =>
    new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
  );
  const latest = sorted[0]?.weight || sorted[0]?.bodyWeight;
  const previous = sorted[1]?.weight || sorted[1]?.bodyWeight;
  if (!latest || !previous) return null;
  const diff = latest - previous;
  if (Math.abs(diff) < 0.5) return 'stable';
  return diff < 0 ? 'improving' : 'declining'; // Weight loss = improving (fitness context)
}

/**
 * Scrub free text that is about to be sent to a cloud model.
 *
 * WHY THIS EXISTS (SWA-71, 2026-07-28): `deIdentifyClient` correctly excluded the STRUCTURED
 * identifiers — email, phone, date of birth, last name — and correctly abstracted pain entries to
 * `{bodyPart, level}`. But goal text was passed through verbatim, and goal text is where people
 * write sentences. Verified by execution, this payload reached the model intact:
 *
 *   "Sarah wants to squat 200lb — Dr. Smith cleared her after ACL surgery"
 *
 * leaking the client's own first name, their physician's name, and a diagnosis. Rule 8 is
 * categorical (zero PII to LLMs), so free text has to be treated as hostile, not trusted.
 *
 * Two passes, in this order:
 *   1. Replace the client's own name with their alias — we know that string, so this is exact.
 *      Longest-first so "Sarah Connor" is consumed before the bare "Sarah".
 *   2. Strip anything the PHI scanner recognizes (medications, diagnoses, injuries, contact
 *      details), which also covers third parties like a named physician.
 *
 * Never throws: a scrubbing failure must not take down context building. On error the text is
 * dropped entirely rather than returned raw — fail closed, because the caller's next step is to
 * hand this to an external model.
 *
 * @param {string} text - free text from a goal, description, or note
 * @param {string[]} nameParts - the client's real name fragments to alias out
 * @param {string} alias - the alias to substitute (e.g. "Client-42")
 * @returns {string} scrubbed text, or '' if it could not be made safe
 */
function scrubFreeText(text, nameParts, alias) {
  if (!text || typeof text !== 'string') return '';
  try {
    let out = text;

    // Longest first: "Sarah Connor" must be replaced before the bare "Sarah" would match inside it.
    const ordered = [...new Set(nameParts.filter(Boolean))].sort((a, b) => b.length - a.length);
    for (const part of ordered) {
      out = out.replace(new RegExp(`(?<!\\w)${escapeRegexLiteral(part)}(?!\\w)`, 'gi'), alias);
    }

    const { hasPHI, matches } = scanForPHI(out);
    if (hasPHI) out = stripPHI(out, matches);

    return out;
  } catch (error) {
    logger.warn('[deIdentifier] free-text scrub failed — dropping text rather than leaking it', {
      error: error.message
    });
    return '';
  }
}

/** Escape a literal string for safe use inside a RegExp. */
function escapeRegexLiteral(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractGoals(client, enrichment, nameParts = [], alias = '') {
  const goals = [];
  if (client.fitnessGoals) goals.push(...(Array.isArray(client.fitnessGoals) ? client.fitnessGoals : [client.fitnessGoals]));
  if (enrichment.goals) {
    for (const g of enrichment.goals) {
      if (g.description || g.title) goals.push(g.description || g.title);
    }
  }
  // Scrub BEFORE dedup so two spellings that scrub to the same text collapse to one entry.
  const scrubbed = goals.map((g) => scrubFreeText(g, nameParts, alias)).filter(Boolean);
  return [...new Set(scrubbed)].slice(0, 10);
}

function deIdentifyGoals(goals, nameParts = [], alias = '') {
  if (!goals || !Array.isArray(goals)) return [];
  return goals.slice(0, 10).map(g => ({
    // The title is free text and must be scrubbed. The previous comment here claimed "EXCLUDED:
    // any PII in notes" while the TITLE passed through verbatim — dropping `notes` is not the same
    // as excluding PII, and a client's name, their physician's name, and a diagnosis all reached
    // the model through this field.
    title: scrubFreeText(g.title || g.description || '', nameParts, alias) || 'Unnamed goal',
    progress: g.progress || 0,
    status: g.status || 'active',
    // EXCLUDED entirely: `notes` — unbounded free text with no reason to reach a model.
  }));
}

function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// ── Re-Hydration (Server-Side Only) ────────────────────────────────────────

/**
 * Replace de-identified aliases with real names in AI response.
 * V3 safety: Sort aliases by length descending to prevent substring collisions.
 * e.g., "Client-612" won't match inside "Client-61".
 *
 * IMPORTANT: This runs SERVER-SIDE before sending response to frontend.
 * The alias map NEVER leaves the server.
 *
 * @param {string} text - AI response text
 * @param {Record<string, string>} aliasMap - { "Client-61": "Jackie" }
 * @returns {string}
 */
export function rehydrateResponse(text, aliasMap) {
  if (!text || !aliasMap || Object.keys(aliasMap).length === 0) return text;

  // Sort by length descending to prevent "Client-61" matching inside "Client-612"
  const sortedAliases = Object.keys(aliasMap).sort((a, b) => b.length - a.length);

  let result = text;
  for (const alias of sortedAliases) {
    const realName = aliasMap[alias];
    if (!realName) continue;
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Word boundary match — handles possessives ("Client-61's")
    // Use replacer function to avoid $ special char interpretation in realName
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'g'), () => realName);
  }
  return result;
}

/**
 * De-identify a schedule for AI scanning.
 * Only shows slot types and client aliases — no session details.
 *
 * @param {Array} sessions - Raw session records
 * @param {Record<number, string>} clientAliasMap - { 61: "Client-61" }
 * @returns {Array}
 */
export function deIdentifySchedule(sessions, clientAliasMap = {}) {
  if (!sessions || !Array.isArray(sessions)) return [];
  return sessions.map(s => ({
    time: s.startTime || s.time,
    slotType: s.clientId ? 'booked' : 'available',
    clientAlias: s.clientId ? (clientAliasMap[s.clientId] || `Client-${s.clientId}`) : null,
    // EXCLUDED: session notes, NASM phase, payment info
  }));
}
