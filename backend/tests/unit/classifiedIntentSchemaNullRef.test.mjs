/**
 * ClassifiedIntentSchema null tolerance — prod incident regression pin
 * (2026-07-15): the classifier prompt tells the model to output
 * `"clientRef": "client name or null"` and its examples emit the literal
 * null; the schema's bare .optional() rejected null, so EVERY client-less
 * command (all planner commands and logger dictation phrases) collapsed to
 * the chat/confidence-1 fallback in production while the model was classifying
 * correctly. This suite pins the exact rejected payload from the incident.
 */
import { describe, expect, it } from 'vitest';
import { ClassifiedIntentSchema } from '../../services/ai/commandRegistry/baseSchemas.mjs';

describe('ClassifiedIntentSchema (prod incident 2026-07-15)', () => {
  it('accepts the EXACT model output that production rejected', () => {
    const incidentPayload = {
      intent: 'planner_swap_exercise',
      clientRef: null,
      params: { exercise: 'leg press', replacement: 'box squat' },
      confidence: 0.95,
    };
    const result = ClassifiedIntentSchema.safeParse(incidentPayload);
    expect(result.success).toBe(true);
    expect(result.data.intent).toBe('planner_swap_exercise');
  });

  it('accepts clientRef as string, null, or absent — the three shapes the prompt allows', () => {
    for (const clientRef of ['Ron W', null, undefined]) {
      const result = ClassifiedIntentSchema.safeParse({
        intent: 'view_client_profile',
        ...(clientRef !== undefined ? { clientRef } : {}),
        params: {},
        confidence: 0.9,
      });
      expect(result.success, `clientRef=${String(clientRef)}`).toBe(true);
    }
  });

  it('tolerates a null params object the same way', () => {
    const result = ClassifiedIntentSchema.safeParse({
      intent: 'chat', clientRef: null, params: null, confidence: 1,
    });
    expect(result.success).toBe(true);
  });

  it('still rejects genuinely malformed classifications', () => {
    expect(ClassifiedIntentSchema.safeParse({ intent: '', confidence: 0.9 }).success).toBe(false);
    expect(ClassifiedIntentSchema.safeParse({ intent: 'x', confidence: 2 }).success).toBe(false);
    expect(ClassifiedIntentSchema.safeParse({ clientRef: null, confidence: 1 }).success).toBe(false);
  });
});
