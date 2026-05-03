/**
 * V3c.5 — longHorizonPromptBuilder corrective allowlist section
 * ==============================================================
 *
 * Locks the prompt-text contract for the V3c.5 corrective allowlist:
 *   - When bias.available, prompt contains the section header and
 *     the listed exerciseKeys + names + citations.
 *   - When bias.available is false, NO section is emitted (no empty
 *     "Corrective Allowlist" stub, no broken header).
 *   - When bias.matchedCount === 0 but bias.available === true, the
 *     section emits the compensations + a "no registry coverage"
 *     directive instead of an empty list.
 *   - PII safety: prompt text never contains client identifiers.
 */
import { describe, it, expect } from 'vitest';
import { buildLongHorizonPrompt } from '../services/ai/longHorizonPromptBuilder.mjs';

const SAMPLE_DEIDENTIFIED = { clientToken: 'opaque-id-123', primaryGoal: 'general_fitness' };

function makeContextWith(correctiveBias) {
  return {
    progressSummary: { recentSessionCount: 0 },
    adherence: null,
    fatigueTrends: null,
    progressionTrends: null,
    goalProgress: null,
    injuryRestrictions: { active: [], resolved: [] },
    bodyComposition: null,
    correctiveBias,
  };
}

describe('V3c.5 prompt — corrective allowlist surfaced when available', () => {
  it('emits the V3c.5 section header + exercise lines when bias is populated', () => {
    const bias = {
      available: true,
      compensations: [
        { type: 'knee_valgus', avgSeverity: 7, frequency: 5, trend: 'worsening' },
      ],
      tags: ['knees_cave', 'pronation_distortion_syndrome'],
      matchedCount: 2,
      allowlist: {
        inhibit: [{
          exerciseKey: 'ces-foam-roll-tfl', name: 'Foam Roll TFL',
          bodyPartCategory: 'recovery', sourceCitation: 'NASM-CES Ch. 7',
        }],
        lengthen: [],
        activate: [{
          exerciseKey: 'ces-lateral-band-walks', name: 'Lateral Band Walks',
          bodyPartCategory: 'recovery', sourceCitation: 'NASM-CES Ch. 7',
        }],
        integrate: [],
      },
    };

    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: SAMPLE_DEIDENTIFIED,
      horizonMonths: 12,
      longHorizonContext: makeContextWith(bias),
      nasmConstraints: null,
      templateContext: null,
    });

    expect(prompt).toContain('--- V3c.5 Corrective Allowlist');
    expect(prompt).toContain('knee_valgus');
    expect(prompt).toContain('severity 7/10');
    expect(prompt).toContain('Foam Roll TFL');
    expect(prompt).toContain('key=ces-foam-roll-tfl');
    expect(prompt).toContain('NASM-CES Ch. 7');
    expect(prompt).toContain('Lateral Band Walks');
    expect(prompt).toContain('key=ces-lateral-band-walks');
    expect(prompt).toContain('Step: inhibit');
    expect(prompt).toContain('Step: activate');
    // Lengthen/integrate empty arrays must NOT emit empty step headers.
    expect(prompt).not.toContain('Step: lengthen');
    expect(prompt).not.toContain('Step: integrate');
  });

  it('emits the directive guidance line', () => {
    const bias = {
      available: true,
      compensations: [{ type: 'low_back_arch', avgSeverity: 8, frequency: 1, trend: 'stable' }],
      tags: ['low_back_arch'],
      matchedCount: 1,
      allowlist: {
        inhibit: [{ exerciseKey: 'ces-foam-roll-hip-flexor', name: 'Foam Roll Hip Flexor',
                    bodyPartCategory: 'recovery', sourceCitation: 'NASM-CES Ch. 7' }],
        lengthen: [], activate: [], integrate: [],
      },
    };
    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: SAMPLE_DEIDENTIFIED,
      horizonMonths: 12,
      longHorizonContext: makeContextWith(bias),
      nasmConstraints: null,
      templateContext: null,
    });
    expect(prompt).toContain('Soft directive');
    expect(prompt).toContain('Phase 1 stabilization');
    expect(prompt).toContain('CES blocks');
  });

  it('emits the "no registry coverage" branch when matchedCount=0 but available=true', () => {
    const bias = {
      available: true,
      compensations: [{ type: 'knee_varus', avgSeverity: 5, frequency: 1, trend: 'stable' }],
      tags: ['knees_bow'],
      matchedCount: 0,
      allowlist: { inhibit: [], lengthen: [], activate: [], integrate: [] },
    };
    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: SAMPLE_DEIDENTIFIED,
      horizonMonths: 12,
      longHorizonContext: makeContextWith(bias),
      nasmConstraints: null,
      templateContext: null,
    });
    expect(prompt).toContain('--- V3c.5 Corrective Allowlist');
    expect(prompt).toContain('knee_varus');
    expect(prompt).toContain('no V3b.3 corrective rows matched');
    // The name-list directive should NOT fire when matchedCount=0.
    expect(prompt).not.toContain('Step: inhibit');
  });

  it('omits the entire section when bias.available is false', () => {
    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: SAMPLE_DEIDENTIFIED,
      horizonMonths: 12,
      longHorizonContext: makeContextWith({
        available: false,
        compensations: [], tags: [], matchedCount: 0,
        allowlist: { inhibit: [], lengthen: [], activate: [], integrate: [] },
      }),
      nasmConstraints: null,
      templateContext: null,
    });
    expect(prompt).not.toContain('V3c.5 Corrective Allowlist');
    expect(prompt).not.toContain('Soft directive');
  });

  it('omits the section entirely when correctiveBias is missing from context (back-compat)', () => {
    // Old callers (pre-V3c.5) pass a context object without the
    // correctiveBias field. The prompt builder must NOT crash and
    // must NOT emit the section.
    const ctx = makeContextWith(undefined);
    delete ctx.correctiveBias;
    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: SAMPLE_DEIDENTIFIED,
      horizonMonths: 12,
      longHorizonContext: ctx,
      nasmConstraints: null,
      templateContext: null,
    });
    expect(prompt).not.toContain('V3c.5 Corrective Allowlist');
  });

  it('caps the allowlist at 8 entries per step (avoid prompt bloat)', () => {
    const make20 = (prefix) => Array.from({ length: 20 }, (_, i) => ({
      exerciseKey: `${prefix}-${i}`, name: `${prefix} ${i}`,
      bodyPartCategory: 'recovery', sourceCitation: 'NASM-CES',
    }));
    const bias = {
      available: true,
      compensations: [{ type: 'knee_valgus', avgSeverity: 5, frequency: 1, trend: 'stable' }],
      tags: ['knees_cave'],
      matchedCount: 80,
      allowlist: {
        inhibit: make20('ces-inh'),
        lengthen: make20('ces-len'),
        activate: make20('ces-act'),
        integrate: make20('ces-int'),
      },
    };
    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: SAMPLE_DEIDENTIFIED,
      horizonMonths: 12,
      longHorizonContext: makeContextWith(bias),
      nasmConstraints: null,
      templateContext: null,
    });
    // First 8 should appear, item index 8+ should NOT.
    expect(prompt).toContain('key=ces-inh-7');
    expect(prompt).not.toContain('key=ces-inh-8');
    expect(prompt).not.toContain('key=ces-inh-19');
  });
});

describe('V3c.5 prompt — privacy posture', () => {
  it('never emits client identifiers from deidentified payload into the bias section', () => {
    const bias = {
      available: true,
      compensations: [{ type: 'knee_valgus', avgSeverity: 5, frequency: 1, trend: 'stable' }],
      tags: ['knees_cave'],
      matchedCount: 1,
      allowlist: {
        inhibit: [{ exerciseKey: 'ces-foam-roll-tfl', name: 'Foam Roll TFL',
                    bodyPartCategory: 'recovery', sourceCitation: 'NASM-CES Ch. 7' }],
        lengthen: [], activate: [], integrate: [],
      },
    };
    const prompt = buildLongHorizonPrompt({
      deidentifiedPayload: { clientToken: 'opaque-id-secret-12345', primaryGoal: 'general_fitness' },
      horizonMonths: 12,
      longHorizonContext: makeContextWith(bias),
      nasmConstraints: null,
      templateContext: null,
    });

    // The deidentified payload still appears in the client profile
    // section, but the bias section itself must not reference any
    // identifier from it.
    const biasSectionMatch = prompt.match(/--- V3c\.5 Corrective Allowlist[\s\S]*?(?=\n\n---|\n\n[A-Z]|$)/);
    expect(biasSectionMatch).toBeTruthy();
    expect(biasSectionMatch[0]).not.toContain('opaque-id-secret-12345');
    expect(biasSectionMatch[0]).not.toContain('clientToken');
  });
});
