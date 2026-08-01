/**
 * scrubPlanTemplate (S24 — JARVIS blueprint §4.6). Pure, unit-tested PII
 * scrub: turns a client plan payload into a template payload — client id
 * GONE (replaced by the trainer's own id server-side too), personal notes
 * GONE, structure and loads kept. The server re-enforces this scrub;
 * this function is the frontend's contract with it.
 */

export interface TemplateScrubInput {
  title: string;
  planData: unknown;
  nasmPhase?: number | null;
  durationWeeks?: number | null;
  goal?: string | null;
}

export interface ScrubbedTemplatePayload {
  isTemplate: true;
  title: string;
  planData: unknown;
  nasmPhase: number | null;
  durationWeeks: number | null;
  templateMeta: { name: string; phase: number | null; split: null; weeks: number | null; tags: string[] };
  /** Explicitly absent-by-null: personal fields can never ride a template. */
  progressNotes: null;
  description: null;
}

const PERSONAL_KEYS = new Set(['clientId', 'clientName', 'userId', 'progressNotes', 'personalNotes', 'notes']);

/** Deep-strip personal keys from plan structure (loads/structure survive). */
export function stripPersonalKeys<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripPersonalKeys) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (PERSONAL_KEYS.has(key)) continue;
      out[key] = stripPersonalKeys(inner);
    }
    return out as T;
  }
  return value;
}

export function scrubPlanTemplate(input: TemplateScrubInput): ScrubbedTemplatePayload {
  return {
    isTemplate: true,
    title: input.title,
    planData: stripPersonalKeys(input.planData),
    nasmPhase: input.nasmPhase ?? null,
    durationWeeks: input.durationWeeks ?? null,
    templateMeta: {
      name: input.title,
      phase: input.nasmPhase ?? null,
      split: null,
      weeks: input.durationWeeks ?? null,
      tags: input.goal ? [input.goal] : [],
    },
    progressNotes: null,
    description: null,
  };
}
