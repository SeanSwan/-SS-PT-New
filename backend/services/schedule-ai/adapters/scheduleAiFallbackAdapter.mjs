import { getScheduleAiToolSchema, SCHEDULE_AI_TOOL_TYPES } from '../scheduleAiToolSchemas.mjs';

function classify(message = '') {
  const text = String(message).toLowerCase();
  if (/\b(recurring|series)\b/.test(text) && /\b(repair|conflict|heal|drift|gap|fix|optimi[sz]e)\b/.test(text)) {
    return SCHEDULE_AI_TOOL_TYPES.DRAFT_RECURRING_REPAIR;
  }
  if (/\b(charge|charged|payment|refund|reverse|credit|billing|late fee|waive)\b/.test(text)) {
    return SCHEDULE_AI_TOOL_TYPES.OPEN_PAYMENT_REVIEW;
  }
  if (/\b(recovery|recover|fatigue|soreness|pain|injury|injuries|rpe|intensity|training safety|overload)\b/.test(text)
    && /\b(schedule|scheduling|risk|safe|safety|before|load|pain|recovery)\b/.test(text)) {
    return SCHEDULE_AI_TOOL_TYPES.RECOVERY_SAFETY_ADVISORY;
  }
  if (/\b(attention|risk|missing|leak|unpaid|review today|needs)\b/.test(text)) {
    return SCHEDULE_AI_TOOL_TYPES.SHOW_ATTENTION_QUEUE;
  }
  if (/\b(opening|available|availability|free slot|slots?)\b/.test(text)) {
    return SCHEDULE_AI_TOOL_TYPES.FIND_AVAILABILITY;
  }
  if (/\b(move|reschedule|later|earlier|change)\b/.test(text)) {
    return SCHEDULE_AI_TOOL_TYPES.DRAFT_MOVE;
  }
  if (/\b(cancel|cancellation)\b/.test(text)) {
    return SCHEDULE_AI_TOOL_TYPES.DRAFT_CANCEL;
  }
  if (/\b(no-?show|present|attended|late|mark)\b/.test(text)) {
    return SCHEDULE_AI_TOOL_TYPES.MARK_ATTENDANCE;
  }
  if (/\b(book|schedule|add)\b/.test(text)) {
    return SCHEDULE_AI_TOOL_TYPES.DRAFT_BOOKING;
  }
  return SCHEDULE_AI_TOOL_TYPES.SHOW_ATTENTION_QUEUE;
}

export function createScheduleAiFallbackAdapter() {
  return {
    name: 'fallback',
    isConfigured: () => true,
    async generateTurn(payload = {}) {
      const start = Date.now();
      const tool = getScheduleAiToolSchema(classify(payload.message));
      return {
        provider: 'fallback',
        model: 'deterministic-schedule-v1',
        content: tool.executionPolicy === 'read_only'
          ? `I can help with ${tool.description.toLowerCase()}`
          : `I can prepare a safe ${tool.type.replace(/_/g, ' ')} option for review. No data was changed.`,
        toolCalls: [tool],
        latencyMs: Date.now() - start,
        finishReason: 'deterministic',
        tokenUsage: { inputTokens: null, outputTokens: null, totalTokens: null, estimatedCostUsd: 0 },
      };
    },
  };
}
