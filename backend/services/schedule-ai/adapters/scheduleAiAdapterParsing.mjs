import { getScheduleAiToolSchema } from '../scheduleAiToolSchemas.mjs';

function safeJsonParse(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractFirstJsonObject(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const direct = safeJsonParse(trimmed);
  if (direct) return direct;

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  return safeJsonParse(trimmed.slice(start, end + 1));
}

function toolSchemaFromType(type) {
  return getScheduleAiToolSchema(String(type || '').trim()) || null;
}

function toolTypeFromArguments(args) {
  if (!args) return null;
  if (typeof args === 'object') return args.toolType || args.tool || args.action || args.type || null;
  const parsed = safeJsonParse(args);
  return parsed?.toolType || parsed?.tool || parsed?.action || parsed?.type || null;
}

export function buildScheduleAiAdapterPrompt(payload = {}) {
  return JSON.stringify({
    task: 'Classify and answer a SwanStudios schedule request.',
    responseFormat: {
      toolType: 'one of tools[].type',
      response: 'short natural-language answer; do not claim data changed',
    },
    message: payload.message || '',
    context: payload.context || {},
    tools: (payload.tools || []).map((tool) => ({
      type: tool.type,
      description: tool.description,
      executionPolicy: tool.executionPolicy,
      riskLevel: tool.riskLevel,
    })),
  });
}

export function extractScheduleAiToolCalls({ content, rawToolCalls = [] } = {}) {
  const calls = [];

  for (const rawCall of rawToolCalls || []) {
    const functionName = rawCall?.function?.name || rawCall?.name || rawCall?.type;
    const type = toolTypeFromArguments(rawCall?.function?.arguments) || functionName;
    const schema = toolSchemaFromType(type);
    if (schema && !calls.some((call) => call.type === schema.type)) calls.push(schema);
  }

  const parsed = extractFirstJsonObject(content);
  const parsedType = parsed?.toolType || parsed?.tool || parsed?.action || parsed?.type;
  const parsedSchema = toolSchemaFromType(parsedType);
  if (parsedSchema && !calls.some((call) => call.type === parsedSchema.type)) calls.push(parsedSchema);

  return calls;
}

export function normalizeScheduleAiProviderContent(content) {
  const parsed = extractFirstJsonObject(content);
  const response = parsed?.response || parsed?.content || parsed?.message;
  if (typeof response === 'string' && response.trim()) return response.trim();
  return String(content || '').trim();
}
