/**
 * Template Context Builder
 * ========================
 * Resolves NASM templates from server-derived nasmConstraints.
 * Produces structured templateContext for prompt building and audit provenance.
 *
 * Phase 4A — Template Registry + Structured Schema Integration
 *
 * Pipeline position: AFTER de-identification, AFTER buildNasmConstraints(),
 * BEFORE router. Templates contain ZERO user data.
 */
import {
  getTemplateByPhaseKey,
  getTemplateById,
  REGISTRY_VERSION,
} from './nasmTemplateRegistry.mjs';

/**
 * Build template context from server-derived NASM constraints.
 *
 * @param {Object|null} nasmConstraints - Output of buildNasmConstraints() in the controller
 * @returns {Object|null} templateContext or null if no templates resolved
 */
export function buildTemplateContext(nasmConstraints) {
  if (!nasmConstraints || typeof nasmConstraints !== 'object') {
    return null;
  }

  const templateRefs = [];
  let programmingTemplate = null;
  let correctiveTemplate = null;
  let assessmentStatus = null;

  // ── Resolve OPT programming template ──────────────────────────────────
  if (nasmConstraints.optPhase) {
    const optEntry = getTemplateByPhaseKey(nasmConstraints.optPhase);
    if (optEntry && optEntry.status === 'active' && optEntry.schema) {
      templateRefs.push({
        id: optEntry.id,
        templateVersion: optEntry.templateVersion,
        schemaVersion: optEntry.schemaVersion,
        role: 'programming',
      });
      programmingTemplate = {
        id: optEntry.id,
        phase: optEntry.schema.phase,
        phaseName: optEntry.schema.phaseName,
        programming: optEntry.schema.programming,
        contraindications: optEntry.schema.contraindications,
        warmupProtocol: optEntry.schema.warmupProtocol,
      };
    }
  }

  // ── Resolve CES corrective template ───────────────────────────────────
  const compensations = nasmConstraints.ohsaCompensations;
  if (Array.isArray(compensations) && compensations.length > 0) {
    const cesEntry = getTemplateById('ces-corrective-strategy');
    if (cesEntry && cesEntry.status === 'active' && cesEntry.schema) {
      templateRefs.push({
        id: cesEntry.id,
        templateVersion: cesEntry.templateVersion,
        schemaVersion: cesEntry.schemaVersion,
        role: 'corrective',
      });

      // Filter compensationMap to only relevant compensations
      const compensationKeys = extractCompensationKeys(compensations);
      const relevantCompensations = cesEntry.schema.compensationMap.filter(
        c => compensationKeys.has(c.compensationKey),
      );

      correctiveTemplate = {
        id: cesEntry.id,
        templateVersion: cesEntry.templateVersion,
        relevantCompensations,
        severityScoring: cesEntry.schema.severityScoring,
      };
    }
  }

  // ── Resolve PAR-Q+ assessment status ──────────────────────────────────
  if (nasmConstraints.medicalClearanceRequired !== undefined || nasmConstraints.parqClearance !== undefined) {
    const parqEntry = getTemplateById('parq-plus-screening');
    if (parqEntry && parqEntry.status === 'active') {
      templateRefs.push({
        id: parqEntry.id,
        templateVersion: parqEntry.templateVersion,
        schemaVersion: parqEntry.schemaVersion,
        role: 'assessment',
      });
      assessmentStatus = {
        parqComplete: true,
        medicalClearanceRequired: nasmConstraints.medicalClearanceRequired ?? false,
        parqClearance: nasmConstraints.parqClearance ?? true,
      };
    }
  }

  // ── No templates resolved ─────────────────────────────────────────────
  if (templateRefs.length === 0) {
    return null;
  }

  const primaryTemplateId = programmingTemplate?.id
    ?? templateRefs[0]?.id
    ?? null;

  return {
    primaryTemplateId,
    templateRefs,
    registryVersion: REGISTRY_VERSION,
    programmingTemplate,
    correctiveTemplate,
    assessmentStatus,
  };
}

/**
 * Extract compensation keys from the human-readable strings produced by
 * extractOhsaCompensations() in the controller.
 *
 * The controller produces strings like "moderate knee valgus", "minor feet turnout".
 * We match these against known OHSA keys.
 *
 * @param {string[]} compensationStrings
 * @returns {Set<string>}
 */
function extractCompensationKeys(compensationStrings) {
  const LABEL_TO_KEY = {
    'knee valgus': 'kneeValgus',
    'feet turnout': 'feetTurnout',
    'feet turn out': 'feetTurnout',
    'feet flattening': 'feetFlattening',
    'excessive forward lean': 'excessiveForwardLean',
    'low back arch': 'lowBackArch',
    'arms fall forward': 'armsFallForward',
    'forward head': 'forwardHead',
    'knee varus': 'kneeVarus',
    'asymmetric weight shift': 'asymmetricWeightShift',
  };

  const keys = new Set();
  for (const str of compensationStrings) {
    const lower = String(str).toLowerCase();
    for (const [label, key] of Object.entries(LABEL_TO_KEY)) {
      if (lower.includes(label)) {
        keys.add(key);
      }
    }
  }
  return keys;
}
