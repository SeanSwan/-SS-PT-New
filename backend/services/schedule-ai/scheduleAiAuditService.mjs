import crypto from 'crypto';
import logger from '../../utils/logger.mjs';

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value === undefined ? null : value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
}

export function hashJsonForAudit(value) {
  return crypto.createHash('sha256').update(canonicalize(value)).digest('hex');
}

export async function recordScheduleAiProviderAudit(entry, { AuditModel = null } = {}) {
  try {
    const Model = AuditModel || (await import('../../models/AiInteractionLog.mjs')).default;
    await Model.create({
      userId: entry.userId,
      provider: entry.provider,
      model: entry.model || 'unknown',
      requestType: 'schedule_conversation',
      payloadHash: entry.payloadHash,
      outputHash: entry.outputHash || null,
      promptVersion: entry.promptVersion || 'schedule-ai-v1',
      tokenUsage: entry.tokenUsage || null,
      status: entry.status || 'success',
      errorCode: entry.errorCode || null,
      durationMs: Number.isFinite(entry.durationMs) ? entry.durationMs : null,
    });
    return true;
  } catch (err) {
    logger.error('[ScheduleAI] Audit write failed', {
      provider: entry?.provider,
      status: entry?.status,
      error: err?.message,
    });
    return false;
  }
}
