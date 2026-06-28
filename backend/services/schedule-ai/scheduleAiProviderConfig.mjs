export const SCHEDULE_AI_PROVIDER_MODES = Object.freeze([
  'fallback_only',
  'gemini_cloud',
  'local_gpu',
  'hybrid_local_first',
  'hybrid_cloud_first',
]);

const DEFAULT_PROVIDER_TIMEOUT_MS = 7000;
const DEFAULT_GLOBAL_TIMEOUT_MS = 14000;

function envBool(env, key, defaultValue = false) {
  const value = env?.[key];
  if (value === undefined || value === null || value === '') return defaultValue;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
}

function envDisabled(env, key, defaultValue = false) {
  const value = env?.[key];
  if (value === undefined || value === null || value === '') return defaultValue;
  if (/^(0|false|no|off)$/i.test(String(value).trim())) return false;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
}

function envInt(env, key, fallback) {
  const value = Number(env?.[key]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function normalizeMode(mode) {
  return SCHEDULE_AI_PROVIDER_MODES.includes(mode) ? mode : 'fallback_only';
}

function uniqueAppend(list, value) {
  return list.includes(value) ? list : [...list, value];
}

export function buildScheduleAiProviderOrder({ mode = 'fallback_only', killSwitches = {} } = {}) {
  if (killSwitches.allAiDisabled) return ['fallback'];

  const normalizedMode = normalizeMode(mode);
  let order = [];

  if (normalizedMode === 'gemini_cloud') order = ['gemini_cloud'];
  if (normalizedMode === 'local_gpu') order = ['local_gpu'];
  if (normalizedMode === 'hybrid_local_first') order = ['local_gpu', 'gemini_cloud'];
  if (normalizedMode === 'hybrid_cloud_first') order = ['gemini_cloud', 'local_gpu'];

  order = order.filter((provider) => {
    if (provider === 'gemini_cloud') return !killSwitches.cloudDisabled;
    if (provider === 'local_gpu') return !killSwitches.localGpuDisabled;
    return true;
  });

  return uniqueAppend(order, 'fallback');
}

export function resolveScheduleAiProviderConfig(env = process.env) {
  const mode = normalizeMode(env.SCHEDULE_AI_PROVIDER_MODE || 'fallback_only');
  const killSwitches = {
    allAiDisabled: envBool(env, 'SCHEDULE_AI_DISABLE_ALL', false),
    cloudDisabled: envBool(env, 'SCHEDULE_AI_DISABLE_CLOUD', false),
    localGpuDisabled: envBool(env, 'SCHEDULE_AI_DISABLE_LOCAL_GPU', false),
    writeProposalsDisabled: envDisabled(env, 'SCHEDULE_AI_DISABLE_WRITE_PROPOSALS', true),
    billingProposalsDisabled: envDisabled(env, 'SCHEDULE_AI_DISABLE_BILLING_PROPOSALS', true),
  };

  return {
    mode,
    providerOrder: buildScheduleAiProviderOrder({ mode, killSwitches }),
    killSwitches,
    timeouts: {
      providerMs: envInt(env, 'SCHEDULE_AI_TIMEOUT_MS', DEFAULT_PROVIDER_TIMEOUT_MS),
      globalMs: envInt(env, 'SCHEDULE_AI_GLOBAL_TIMEOUT_MS', DEFAULT_GLOBAL_TIMEOUT_MS),
    },
    models: {
      gemini: env.SCHEDULE_AI_GEMINI_MODEL || env.AI_GEMINI_MODEL || 'gemini-2.5-flash',
      localGpu: env.SCHEDULE_AI_LOCAL_GPU_MODEL || 'local-schedule-ai',
    },
  };
}

export function getScheduleAiProviderHealth(config, adapters = {}) {
  const providerOrder = Array.isArray(config?.providerOrder)
    ? config.providerOrder
    : buildScheduleAiProviderOrder(config || {});

  return {
    mode: config?.mode || 'fallback_only',
    killSwitches: config?.killSwitches || {},
    timeouts: config?.timeouts || {},
    providers: providerOrder.map((name) => {
      const adapter = adapters[name];
      let configured = false;
      try {
        configured = Boolean(adapter?.isConfigured?.());
      } catch {
        configured = false;
      }
      const available = name === 'fallback' ? true : configured;
      return { name, configured, available };
    }),
  };
}
