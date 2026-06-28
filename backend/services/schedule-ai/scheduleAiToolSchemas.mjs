export const SCHEDULE_AI_TOOL_TYPES = Object.freeze({
  SHOW_ATTENTION_QUEUE: 'show_attention_queue',
  FIND_AVAILABILITY: 'find_availability',
  DRAFT_BOOKING: 'draft_booking',
  DRAFT_MOVE: 'draft_move',
  DRAFT_CANCEL: 'draft_cancel',
  MARK_ATTENDANCE: 'mark_attendance',
  OPEN_PAYMENT_REVIEW: 'open_payment_review',
  DRAFT_RECURRING_REPAIR: 'draft_recurring_repair',
  RECOVERY_SAFETY_ADVISORY: 'recovery_safety_advisory',
  MANUAL_SCHEDULE_REVIEW: 'manual_schedule_review',
});

const TOOLS = Object.freeze([
  {
    type: SCHEDULE_AI_TOOL_TYPES.SHOW_ATTENTION_QUEUE,
    description: 'Summarize schedule sessions that need attendance, payment, cancellation, or package review.',
    mutatesData: false,
    executionPolicy: 'read_only',
    riskLevel: 'low',
  },
  {
    type: SCHEDULE_AI_TOOL_TYPES.FIND_AVAILABILITY,
    description: 'Find candidate openings for a client/trainer/time-window request.',
    mutatesData: false,
    executionPolicy: 'read_only',
    riskLevel: 'low',
  },
  {
    type: SCHEDULE_AI_TOOL_TYPES.DRAFT_BOOKING,
    description: 'Draft a booking proposal for human review.',
    mutatesData: false,
    executionPolicy: 'proposal_only',
    riskLevel: 'schedule_write',
  },
  {
    type: SCHEDULE_AI_TOOL_TYPES.DRAFT_MOVE,
    description: 'Draft a reschedule proposal for human review.',
    mutatesData: false,
    executionPolicy: 'proposal_only',
    riskLevel: 'schedule_write',
  },
  {
    type: SCHEDULE_AI_TOOL_TYPES.DRAFT_CANCEL,
    description: 'Draft a cancellation proposal for human review.',
    mutatesData: false,
    executionPolicy: 'proposal_only',
    riskLevel: 'schedule_write',
  },
  {
    type: SCHEDULE_AI_TOOL_TYPES.MARK_ATTENDANCE,
    description: 'Draft an attendance outcome proposal for human review.',
    mutatesData: false,
    executionPolicy: 'proposal_only',
    riskLevel: 'attendance_write',
  },
  {
    type: SCHEDULE_AI_TOOL_TYPES.OPEN_PAYMENT_REVIEW,
    description: 'Open a manual payment or credit review; AI never charges, refunds, or reverses money.',
    mutatesData: false,
    executionPolicy: 'manual_only',
    riskLevel: 'billing_review',
  },
  {
    type: SCHEDULE_AI_TOOL_TYPES.DRAFT_RECURRING_REPAIR,
    description: 'Draft recurring-series repair suggestions for trainer conflicts, trainer gaps, or client preference drift.',
    mutatesData: false,
    executionPolicy: 'proposal_only',
    riskLevel: 'schedule_write',
  },
  {
    type: SCHEDULE_AI_TOOL_TYPES.RECOVERY_SAFETY_ADVISORY,
    description: 'Review recovery, active pain, and recent training load before scheduling. Read-only advisory only.',
    mutatesData: false,
    executionPolicy: 'read_only',
    riskLevel: 'low',
  },
  {
    type: SCHEDULE_AI_TOOL_TYPES.MANUAL_SCHEDULE_REVIEW,
    description: 'Open the manual schedule controls when schedule-write proposals are disabled.',
    mutatesData: false,
    executionPolicy: 'manual_only',
    riskLevel: 'schedule_write',
  },
]);

export function getScheduleAiToolSchemas() {
  return TOOLS.map((tool) => ({ ...tool }));
}

export function getScheduleAiToolSchema(type) {
  return getScheduleAiToolSchemas().find((tool) => tool.type === type) || null;
}