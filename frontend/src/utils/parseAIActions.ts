/**
 * parseAIActions
 * ==============
 * Detects structured action blocks in AI assistant responses.
 * Actions are JSON blocks that the frontend can execute with one-tap confirmation.
 *
 * Supported action types:
 *   CREATE_WORKOUT  — Parsed workout plan → Apply to Logger
 *   LOG_NUTRITION   — Food items with macros → Log to nutrition tracker
 *   UPDATE_MEASUREMENTS — Body measurements → Save to profile
 *   ADD_NOTE        — Trainer note → Save to client record
 *   CREATE_PLAN     — Multi-week plan → Save as program
 *   ONBOARD_CLIENT  — Parsed client intake → Pre-fill onboarding form
 *
 * Format in AI responses:
 *   ```json
 *   {"action": "CREATE_WORKOUT", "data": { ... }}
 *   ```
 */

export type AIActionType =
  | 'CREATE_WORKOUT'
  | 'LOG_NUTRITION'
  | 'UPDATE_MEASUREMENTS'
  | 'ADD_NOTE'
  | 'CREATE_PLAN'
  | 'ONBOARD_CLIENT';

export interface AIAction {
  type: AIActionType;
  data: Record<string, unknown>;
  rawJson: string;
}

// Action metadata for UI rendering
export const ACTION_META: Record<AIActionType, { label: string; icon: string; confirmLabel: string; color: string }> = {
  CREATE_WORKOUT: { label: 'Workout Plan', icon: 'Dumbbell', confirmLabel: 'Apply to Logger', color: '#8B5CF6' },
  LOG_NUTRITION: { label: 'Nutrition Log', icon: 'Utensils', confirmLabel: 'Log Meals', color: '#60C0F0' },
  UPDATE_MEASUREMENTS: { label: 'Measurements', icon: 'Ruler', confirmLabel: 'Save Measurements', color: '#50A0F0' },
  ADD_NOTE: { label: 'Trainer Note', icon: 'FileText', confirmLabel: 'Save Note', color: '#C6A84B' },
  CREATE_PLAN: { label: 'Training Plan', icon: 'Calendar', confirmLabel: 'Save Plan', color: '#8B5CF6' },
  ONBOARD_CLIENT: { label: 'Client Onboarding', icon: 'UserPlus', confirmLabel: 'Confirm & Create Client', color: '#8B5CF6' },
};

const VALID_ACTIONS = new Set<string>(['CREATE_WORKOUT', 'LOG_NUTRITION', 'UPDATE_MEASUREMENTS', 'ADD_NOTE', 'CREATE_PLAN', 'ONBOARD_CLIENT']);

/**
 * Parse AI response text for action blocks.
 * Returns an array of detected actions (usually 0 or 1 per message).
 */
export function parseAIActions(content: string): AIAction[] {
  const actions: AIAction[] = [];

  // Match JSON code blocks
  const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)```/g;
  let match;

  while ((match = jsonBlockRegex.exec(content)) !== null) {
    const rawJson = match[1].trim();
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed && typeof parsed === 'object' && parsed.action && VALID_ACTIONS.has(parsed.action)) {
        actions.push({
          type: parsed.action as AIActionType,
          data: parsed.data || parsed,
          rawJson,
        });
      }
    } catch {
      // Not valid JSON — skip
    }
  }

  // Also check for inline action markers: [ACTION:TYPE]
  const inlineRegex = /\[ACTION:(\w+)\]\s*```(?:json)?\s*\n?([\s\S]*?)```/g;
  while ((match = inlineRegex.exec(content)) !== null) {
    const actionType = match[1];
    const rawJson = match[2].trim();
    if (VALID_ACTIONS.has(actionType)) {
      try {
        const parsed = JSON.parse(rawJson);
        // Avoid duplicates from the first pass
        if (!actions.some(a => a.rawJson === rawJson)) {
          actions.push({
            type: actionType as AIActionType,
            data: parsed.data || parsed,
            rawJson,
          });
        }
      } catch {
        // Not valid JSON — skip
      }
    }
  }

  return actions;
}

/**
 * Remove action JSON blocks from display text (show clean message + action card separately).
 */
export function stripActionBlocks(content: string): string {
  // Remove [ACTION:TYPE] markers
  let cleaned = content.replace(/\[ACTION:\w+\]\s*/g, '');
  // Remove JSON blocks that contain action fields
  cleaned = cleaned.replace(/```(?:json)?\s*\n?\s*\{[^}]*"action"\s*:\s*"[A-Z_]+"[^}]*\}[\s\S]*?```/g, '');
  return cleaned.trim();
}
