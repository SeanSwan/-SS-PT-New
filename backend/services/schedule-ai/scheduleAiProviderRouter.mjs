import {
  buildScheduleAiProviderOrder,
  resolveScheduleAiProviderConfig,
} from './scheduleAiProviderConfig.mjs';
import { prepareScheduleAiProviderPayload } from './scheduleAiPrivacy.mjs';
import { hashJsonForAudit, recordScheduleAiProviderAudit } from './scheduleAiAuditService.mjs';
import {
  SCHEDULE_AI_TOOL_TYPES,
  getScheduleAiToolSchema,
  getScheduleAiToolSchemas,
} from './scheduleAiToolSchemas.mjs';
import { createScheduleAiFallbackAdapter } from './adapters/scheduleAiFallbackAdapter.mjs';
import { createScheduleAiGeminiAdapter } from './adapters/scheduleAiGeminiAdapter.mjs';
import { createScheduleAiLocalGpuAdapter } from './adapters/scheduleAiLocalGpuAdapter.mjs';

function normalizeConfig(input = {}) {
  const base = resolveScheduleAiProviderConfig();
  const mode = input.mode || base.mode;
  const killSwitches = { ...base.killSwitches, ...(input.killSwitches || {}) };
  const timeouts = { ...base.timeouts, ...(input.timeouts || {}) };
  return {
    ...base,
    ...input,
    mode,
    killSwitches,
    timeouts,
    providerOrder: input.providerOrder || buildScheduleAiProviderOrder({ mode, killSwitches }),
  };
}

function defaultAdapters() {
  return {
    gemini_cloud: createScheduleAiGeminiAdapter(),
    local_gpu: createScheduleAiLocalGpuAdapter(),
    fallback: createScheduleAiFallbackAdapter(),
  };
}

function errorCode(err) {
  return err?.code || 'UNKNOWN_PROVIDER_ERROR';
}

const SCHEDULE_WRITE_RISKS = new Set(['schedule_write', 'attendance_write']);

function applyKillSwitchesToResult(result, config) {
  if (!result || !Array.isArray(result.toolCalls)) return result;

  let replaced = false;
  const guardedToolCalls = result.toolCalls.map((tool) => {
    const isScheduleWrite = SCHEDULE_WRITE_RISKS.has(tool?.riskLevel);
    if (
      config.killSwitches.writeProposalsDisabled
      && isScheduleWrite
      && tool?.type !== SCHEDULE_AI_TOOL_TYPES.MANUAL_SCHEDULE_REVIEW
    ) {
      replaced = true;
      return getScheduleAiToolSchema(SCHEDULE_AI_TOOL_TYPES.MANUAL_SCHEDULE_REVIEW);
    }
    return tool;
  });

  if (!replaced) return result;

  return {
    ...result,
    content: [result.content, 'Schedule-write proposals are disabled; use the manual schedule controls for this action.']
      .filter(Boolean)
      .join(' '),
    toolCalls: guardedToolCalls,
  };
}

function systemMessage(config) {
  return [
    'You are SwanStudios schedule operator AI.',
    'Use only de-identified client/trainer aliases from the payload.',
    'Draft options and explanations; do not claim that schedule, attendance, payment, or credit records were changed.',
    config.killSwitches.writeProposalsDisabled ? 'Schedule-write proposals are disabled; offer read-only guidance.' : 'Schedule-write proposals require human confirmation.',
    config.killSwitches.billingProposalsDisabled ? 'Billing/payment proposals are disabled; route to manual payment review only.' : 'Billing/payment changes still require backend policy and human confirmation.',
  ].join(' ');
}

async function writeAudit({ auditWriter, actor, providerPayload, result, status, errorCode: code, durationMs }) {
  const entry = {
    userId: actor?.id || null,
    provider: result?.provider || 'none',
    model: result?.model || 'none',
    status,
    errorCode: code || null,
    payloadHash: hashJsonForAudit(providerPayload),
    outputHash: result ? hashJsonForAudit({ content: result.content, toolCalls: result.toolCalls || [] }) : null,
    tokenUsage: result?.tokenUsage || null,
    durationMs,
    promptVersion: 'schedule-ai-v1',
  };
  if (auditWriter) return auditWriter(entry);
  return recordScheduleAiProviderAudit(entry);
}

export async function routeScheduleAiTurn({
  actor,
  message,
  context = {},
  config: inputConfig = {},
  adapters: injectedAdapters = {},
  auditWriter = null,
} = {}) {
  const startedAt = Date.now();
  const config = normalizeConfig(inputConfig);
  const adapters = { ...defaultAdapters(), ...injectedAdapters };
  const { providerPayload } = prepareScheduleAiProviderPayload({ actor, message, context });
  const payload = {
    ...providerPayload,
    systemMessage: systemMessage(config),
    tools: getScheduleAiToolSchemas(),
    timeoutMs: config.timeouts.providerMs,
  };
  const failoverTrace = [];
  const errors = [];

  for (const providerName of config.providerOrder) {
    const adapter = adapters[providerName];
    if (!adapter) {
      failoverTrace.push(`${providerName}:not_registered`);
      continue;
    }

    let configured = false;
    try {
      configured = Boolean(adapter.isConfigured());
    } catch {
      configured = false;
    }

    if (!configured) {
      failoverTrace.push(`${providerName}:not_configured`);
      continue;
    }

    try {
      const result = await adapter.generateTurn(payload);
      const guardedResult = applyKillSwitchesToResult(result, config);
      failoverTrace.push(`${providerName}:success`);
      await writeAudit({
        auditWriter,
        actor,
        providerPayload,
        result: guardedResult,
        status: 'success',
        durationMs: Date.now() - startedAt,
      });
      return { ok: true, result: guardedResult, failoverTrace };
    } catch (err) {
      const code = errorCode(err);
      failoverTrace.push(`${providerName}:${code}`);
      errors.push({ provider: providerName, code, message: err?.message || 'Provider failed' });
    }
  }

  await writeAudit({
    auditWriter,
    actor,
    providerPayload,
    result: null,
    status: 'degraded',
    errorCode: errors.at(-1)?.code || 'NO_PROVIDER_AVAILABLE',
    durationMs: Date.now() - startedAt,
  });
  return { ok: false, degraded: true, errors, failoverTrace };
}