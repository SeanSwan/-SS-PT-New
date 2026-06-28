import { sanitizeText } from '../../middleware/piiSanitizationMiddleware.mjs';

const IDENTITY_KEYS = new Set(['email', 'phone', 'firstName', 'lastName', 'displayName', 'fullName', 'clientName', 'trainerName']);
const ENTITY_KEYS = new Set(['client', 'trainer']);

function cleanString(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function entityName(entity) {
  return cleanString(entity?.displayName || entity?.fullName || [entity?.firstName, entity?.lastName].filter(Boolean).join(' '));
}

function entityAlias(kind, id) {
  const label = kind === 'trainer' ? 'Trainer' : 'Client';
  return `${label} #${id}`;
}

function addEntity(entities, kind, raw) {
  if (!raw || typeof raw !== 'object') return;
  const id = Number(raw.id ?? raw.userId ?? raw.clientId ?? raw.trainerId);
  if (!Number.isSafeInteger(id) || id <= 0) return;
  const alias = entityAlias(kind, id);
  const displayName = entityName(raw);
  const terms = [
    displayName,
    raw.firstName,
    raw.lastName,
    raw.email,
    raw.phone,
  ].map(cleanString).filter((term) => term.length >= 3);

  entities.set(`${kind}:${id}`, {
    kind,
    id,
    alias,
    displayName: displayName || alias,
    terms: [...new Set(terms)].sort((a, b) => b.length - a.length),
  });
}

function collectEntities(value, entities = new Map(), depth = 0) {
  if (!value || typeof value !== 'object' || depth > 5) return entities;
  if (Array.isArray(value)) {
    for (const item of value) collectEntities(item, entities, depth + 1);
    return entities;
  }

  if (value.client) addEntity(entities, 'client', value.client);
  if (value.trainer) addEntity(entities, 'trainer', value.trainer);
  if (Array.isArray(value.entities)) {
    for (const entity of value.entities) addEntity(entities, entity?.kind || 'client', entity);
  }

  for (const nested of Object.values(value)) collectEntities(nested, entities, depth + 1);
  return entities;
}

function replaceAliases(text, entities) {
  let output = String(text || '');
  let aliasReplacements = 0;
  for (const entity of entities.values()) {
    for (const term of entity.terms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const before = output;
      output = output.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), entity.alias);
      if (output !== before) aliasReplacements += 1;
    }
  }
  return { text: output, aliasReplacements };
}

export function sanitizeScheduleAiText(text, { entities = new Map() } = {}) {
  const aliasResult = replaceAliases(text || '', entities);
  const nameHints = [...entities.values()].flatMap((entity) => entity.terms);
  const sanitized = sanitizeText(aliasResult.text, { nameHints });
  return {
    text: sanitized.sanitized,
    detections: sanitized.detections,
    hasCriticalPII: sanitized.hasCriticalPII,
    aliasReplacements: aliasResult.aliasReplacements,
  };
}

function sanitizeContextValue(value, entities, key = null, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 8) return '[REDACTED_MAX_DEPTH]';
  if (typeof value === 'string') return sanitizeScheduleAiText(value, { entities }).text;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeContextValue(item, entities, key, depth + 1));
  if (typeof value !== 'object') return null;

  if (ENTITY_KEYS.has(key)) return undefined;

  const output = {};
  if (value.client) {
    const id = Number(value.client.id ?? value.client.userId ?? value.client.clientId);
    if (Number.isSafeInteger(id) && id > 0) output.clientAlias = entityAlias('client', id);
  }
  if (value.trainer) {
    const id = Number(value.trainer.id ?? value.trainer.userId ?? value.trainer.trainerId);
    if (Number.isSafeInteger(id) && id > 0) output.trainerAlias = entityAlias('trainer', id);
  }

  for (const [childKey, childValue] of Object.entries(value)) {
    if (ENTITY_KEYS.has(childKey) || IDENTITY_KEYS.has(childKey)) continue;
    const sanitized = sanitizeContextValue(childValue, entities, childKey, depth + 1);
    if (sanitized !== undefined) output[childKey] = sanitized;
  }
  return output;
}

export function prepareScheduleAiProviderPayload({ actor, message, context = {} } = {}) {
  const entities = collectEntities(context);
  const safeMessage = sanitizeScheduleAiText(message || '', { entities });
  const safeContext = sanitizeContextValue(context, entities);
  const aliasMap = {};
  for (const entity of entities.values()) {
    aliasMap[entity.alias] = {
      kind: entity.kind,
      id: entity.id,
      displayName: entity.displayName,
    };
  }

  return {
    providerPayload: {
      requestType: 'schedule_conversation',
      actor: { id: actor?.id ?? null, role: actor?.role || 'unknown' },
      message: safeMessage.text,
      context: safeContext || {},
      privacy: {
        aliasCount: Object.keys(aliasMap).length,
        redactionCount: safeMessage.detections.length + safeMessage.aliasReplacements,
        criticalPiiDetected: safeMessage.hasCriticalPII,
      },
    },
    aliasMap,
    redactions: safeMessage.detections,
    hasCriticalPII: safeMessage.hasCriticalPII,
  };
}
