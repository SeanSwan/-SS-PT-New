/**
 * scrubPlanTemplate.test.ts — S24 PII-scrub fence: zero client identifiers
 * or personal notes survive templating, at any depth; structure and loads do.
 */
import { describe, expect, it } from 'vitest';
import { scrubPlanTemplate, stripPersonalKeys } from './scrubPlanTemplate';

describe('S24 scrubPlanTemplate', () => {
  it('strips client identifiers and notes at every depth, keeps structure', () => {
    const scrubbed = scrubPlanTemplate({
      title: 'Phase 2 Builder',
      nasmPhase: 2,
      durationWeeks: 12,
      goal: 'hypertrophy',
      planData: {
        clientId: 42,
        clientName: 'Marcus Alvarez',
        weeks: [{ days: [{ notes: 'knee was sore after set 2', exercises: [{ name: 'Bench Press', load: 185, userId: 42 }] }] }],
      },
    });
    const json = JSON.stringify(scrubbed);
    expect(json).not.toContain('42');
    expect(json).not.toContain('Marcus');
    expect(json).not.toContain('knee was sore');
    expect(json).toContain('Bench Press');
    expect(json).toContain('185');
    expect(scrubbed.progressNotes).toBeNull();
    expect(scrubbed.isTemplate).toBe(true);
    expect(scrubbed.templateMeta).toEqual({ name: 'Phase 2 Builder', phase: 2, split: null, weeks: 12, tags: ['hypertrophy'] });
  });

  it('stripPersonalKeys handles arrays and primitives without mutation', () => {
    const input = [{ clientId: 1, keep: 'yes' }, 'plain', 3];
    const out = stripPersonalKeys(input);
    expect(out).toEqual([{ keep: 'yes' }, 'plain', 3]);
    expect(input[0]).toEqual({ clientId: 1, keep: 'yes' });
  });
});
