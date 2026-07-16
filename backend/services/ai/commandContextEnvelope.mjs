/**
 * ============================================================================
 * FILE: commandContextEnvelope.mjs
 * PURPOSE: Build the trusted per-turn context fence for the shared Swan brain.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15 (Fable final plan, Slice 2)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Converts an authenticated actor plus untrusted surface
 * hints into a minimal, server-derived capability and entity envelope.
 * HOW IT FITS IN THE APP: AI command route -> this policy -> classifier/router.
 * KEY DECISIONS: Callers inject plan loading and authorization; missing
 * dependencies fail closed. Plan content and human names are never returned.
 * NASM PROTOCOL CONTEXT: A plan can be mutated only when the authenticated
 * editor has access and reasons against the current prescribed-plan version.
 */
import { randomUUID } from 'node:crypto';

export const COMMAND_CONTEXT_SCHEMA_VERSION = '1.0';
export const COMMAND_CONTEXT_PROMPT_VERSION = 'swan-command-context-v1';

const EDITOR_ROLES = new Set(['admin', 'trainer']);
const KNOWN_ROLES = new Set(['admin', 'trainer', 'client', 'user']);
const KNOWN_SURFACES = new Set([
  'workout-planner',
  'coach-command-center',
  'workout-logger',
  'client-training-command-bar',
]);
const TOKEN_PATTERN = /^[a-z0-9_-]{1,80}$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

const safeActor = (actor) => {
  const id = Number(actor?.id);
  const role = typeof actor?.role === 'string' ? actor.role.trim().toLowerCase() : '';
  return {
    id: Number.isSafeInteger(id) && id > 0 ? id : null,
    role: KNOWN_ROLES.has(role) ? role : 'unknown',
  };
};

const safeToken = (value) => {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  return TOKEN_PATTERN.test(token) ? token : null;
};

const safeEntityId = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const token = String(value).trim();
  if (!token || token.length > 160) return null;
  return UUID_PATTERN.test(token) || POSITIVE_INTEGER_PATTERN.test(token) ? token : null;
};

const safePositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const plain = (record) => (record?.toJSON ? record.toJSON() : record);

const authoritativeVersion = (record) => {
  const revision = safePositiveInteger(record?.contentRevision);
  if (revision) return String(revision);
  const timestamp = record?.updatedAt instanceof Date
    ? record.updatedAt
    : new Date(record?.updatedAt || Number.NaN);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
};

const baseCapabilities = (surfaceId, editor = false) => {
  if (surfaceId === 'generic') return ['conversation'];
  const capabilities = ['conversation', 'clarification'];
  if (surfaceId === 'coach-command-center') {
    capabilities.push('analysis', 'proposal', 'navigation:open-plan');
  }
  if (
    editor
    && (surfaceId === 'workout-logger' || surfaceId === 'client-training-command-bar')
  ) {
    capabilities.push('workout-form:mutate');
  }
  return capabilities;
};

const entityCapabilities = ({ surfaceId, editor, versionCurrent }) => {
  if (surfaceId === 'workout-planner') {
    const capabilities = ['plan:analyze', 'plan:propose'];
    if (editor && versionCurrent) {
      capabilities.push('plan:mutate', 'plan:preview', 'plan:undo');
    }
    return capabilities;
  }
  if (surfaceId === 'coach-command-center') {
    return ['plan:analyze', 'plan:propose', 'navigation:open-plan'];
  }
  return [];
};

const emptyEnvelope = ({ actor, surfaceId, contextStatus, correlationId, capabilities }) => ({
  schemaVersion: COMMAND_CONTEXT_SCHEMA_VERSION,
  contextStatus,
  surfaceId,
  actor,
  permissions: { readEntity: false, mutateEntity: false },
  capabilities: capabilities || baseCapabilities(
    surfaceId, contextStatus !== 'CTX_UNTRUSTED' && EDITOR_ROLES.has(actor.role),
  ),
  entity: null,
  correlationId,
  promptVersion: COMMAND_CONTEXT_PROMPT_VERSION,
  modelVersion: null,
});

/**
 * Builds one minimal trusted context envelope.
 *
 * `request` is untrusted. Only its surface/entity/version/correlation hints are
 * read. `actor`, plan truth, and authorization are server-owned dependencies.
 *
 * @param {object} input
 * @param {object} input.actor Authenticated request user.
 * @param {object} input.request Untrusted client hints.
 * @param {(id: string) => Promise<object|null>} [input.loadPlan]
 * @param {(actorId: number, role: string, clientId: number) => Promise<boolean>} [input.authorizeClient]
 * @returns {Promise<object>} PII-minimized context envelope.
 */
export async function buildCommandContextEnvelope({
  actor: rawActor,
  request = {},
  loadPlan = async () => null,
  authorizeClient = async () => false,
} = {}) {
  const actor = safeActor(rawActor);
  const editor = EDITOR_ROLES.has(actor.role);
  const hintedSurface = safeToken(request.surfaceHint);
  const surfaceId = hintedSurface && KNOWN_SURFACES.has(hintedSurface)
    ? hintedSurface
    : 'generic';
  const correlationId = safeToken(request.correlationId) || randomUUID();

  if (!actor.id || actor.role === 'unknown' || surfaceId === 'generic') {
    return emptyEnvelope({ actor, surfaceId, contextStatus: 'CTX_UNTRUSTED', correlationId });
  }

  const entityId = safeEntityId(request.entityId);
  if (!entityId) {
    const capabilities = baseCapabilities(surfaceId, editor);
    if (surfaceId === 'workout-planner' && editor) {
      capabilities.push('planner-draft:mutate');
    }
    return emptyEnvelope({
      actor,
      surfaceId,
      contextStatus: surfaceId === 'workout-planner' ? 'CTX_MISSING' : 'READY',
      correlationId,
      capabilities,
    });
  }

  let record;
  try {
    record = plain(await loadPlan(entityId));
  } catch {
    return emptyEnvelope({ actor, surfaceId, contextStatus: 'CTX_UNTRUSTED', correlationId });
  }
  const clientId = safePositiveInteger(record?.userId);
  const recordEntityId = safeEntityId(record?.id);
  const selectedClientWasSupplied = request.selectedClientId != null && request.selectedClientId !== '';
  const selectedClientId = !selectedClientWasSupplied
    ? null
    : safePositiveInteger(request.selectedClientId);
  if (!record || !clientId || !recordEntityId || recordEntityId !== entityId
    || (selectedClientWasSupplied && !selectedClientId)
    || (selectedClientId && selectedClientId !== clientId)) {
    return emptyEnvelope({ actor, surfaceId, contextStatus: 'CTX_UNTRUSTED', correlationId });
  }

  let authorized = false;
  try {
    authorized = await authorizeClient(actor.id, actor.role, clientId);
  } catch {
    authorized = false;
  }
  if (!authorized) {
    return emptyEnvelope({ actor, surfaceId, contextStatus: 'CTX_UNTRUSTED', correlationId });
  }

  const version = authoritativeVersion(record);
  const requestedVersion = typeof request.entityVersion === 'string'
    || typeof request.entityVersion === 'number'
    ? String(request.entityVersion).trim()
    : null;
  const hasVersion = Boolean(version && requestedVersion);
  const versionCurrent = hasVersion && requestedVersion === version;
  const contextStatus = !hasVersion ? 'CTX_MISSING' : versionCurrent ? 'READY' : 'CTX_STALE';
  const capabilities = [...new Set([
    ...baseCapabilities(surfaceId, editor),
    ...entityCapabilities({ surfaceId, editor, versionCurrent }),
  ])];

  return {
    schemaVersion: COMMAND_CONTEXT_SCHEMA_VERSION,
    contextStatus,
    surfaceId,
    actor,
    permissions: {
      readEntity: true,
      mutateEntity: surfaceId === 'workout-planner' && editor && versionCurrent,
    },
    capabilities,
    entity: {
      type: 'workout_plan',
      id: recordEntityId,
      clientId,
      version,
    },
    correlationId,
    promptVersion: COMMAND_CONTEXT_PROMPT_VERSION,
    modelVersion: null,
  };
}

export default buildCommandContextEnvelope;
