/**
 * aiChatFreeTextPiiStrip
 * ======================
 * Slice 0.1 regression lock (Rule 8 — zero PII to LLMs).
 *
 * enrichWithUserData() already strips the known client's identity from trainer
 * notes (#10) and session notes (#17) via stripIdentityFromNotes(). But several
 * OTHER free-text clinical fields were interpolated into the AI context RAW:
 *   - CLIENT PROFILE healthConcerns
 *   - MASTER PROMPT goals.notes / injuries
 *   - MOVEMENT trainerNotes
 *   - BASELINE injuryNotes
 *   - PAIN description
 * A trainer-typed client name inside any of those reached Gemini unmasked.
 *
 * This test plants the client's real name ("Jackie Smith") inside those free-text
 * fields and asserts the assembled context masks identity to "[Client #42]" while
 * PRESERVING the clinical language (hypertension / knee / low-sodium) the coach AI
 * needs. It fails before the fix (raw name present) and passes after.
 *
 * NOTE: this is a hardening of an existing, AI-Village-validated privacy design —
 * NOT a refutation of it. The headline "names are deliberately fed to Gemini"
 * claim was verified FALSE (the profile block uses `Client #<id>`); this closes
 * the narrower free-text-field gap only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getExerciseHistoryFromLogsMock } = vi.hoisted(() => ({
  getExerciseHistoryFromLogsMock: vi.fn(),
}));

vi.mock('../../services/analyticsExerciseHistoryService.mjs', () => ({
  getExerciseHistoryFromLogs: getExerciseHistoryFromLogsMock,
}));

import { enrichWithUserData } from '../../services/aiChatService.mjs';

const CLIENT_IDENTITY = {
  firstName: 'Jackie',
  lastName: 'Smith',
  email: 'jackie.smith@example.com',
  phone: '555-867-5309',
};

function createSequelizeWithNameInFreeText() {
  return {
    QueryTypes: { SELECT: 'SELECT' },
    query: vi.fn(async (sql) => {
      // Identity load (line ~1535) — used to BUILD the redaction map, not sent.
      if (sql.includes('"firstName"') && sql.includes('FROM "Users"')) {
        return [CLIENT_IDENTITY];
      }
      // #1 User profile — healthConcerns embeds the client's real name.
      if (sql.includes('"healthConcerns"') && sql.includes('"trainingExperience"')) {
        return [{
          role: 'client',
          createdAt: '2026-01-01',
          fitnessGoal: 'fat_loss',
          weight: 150,
          height: 65,
          dateOfBirth: null,
          gender: 'female',
          healthConcerns:
            'Jackie Smith has hypertension; Jackie reports recurring left knee pain and prefers low-sodium meals',
          trainingExperience: 'beginner',
          masterPromptJson: null,
          availableSessions: 0,
          clientSource: 'swanstudios',
          accountStatus: 'active',
        }];
      }
      // #5 Baseline — injuryNotes embeds the client's last name.
      if (sql.includes('FROM client_baseline_measurements')) {
        return [{
          takenAt: '2026-05-01',
          injuryNotes: 'Smith reinjured the left knee in May',
          bloodPressureSystolic: 122,
          bloodPressureDiastolic: 78,
        }];
      }
      // #16 Pain — description embeds the client's first name.
      if (sql.includes('FROM client_pain_entries')) {
        return [{
          region: 'knee',
          side: 'left',
          pain_level: 6,
          pain_type: 'aching',
          description: 'Jackie says it worsens after squats',
        }];
      }
      return [];
    }),
  };
}

describe('aiChatService enrichWithUserData — free-text clinical field PII stripping (Slice 0.1)', () => {
  beforeEach(() => {
    getExerciseHistoryFromLogsMock.mockReset();
    getExerciseHistoryFromLogsMock.mockResolvedValue({ exercises: [] });
  });

  it('masks the client name embedded in healthConcerns / injuryNotes / pain description', async () => {
    const sequelize = createSequelizeWithNameInFreeText();

    const context = await enrichWithUserData(42, 'trainer', 'coach_assistant', sequelize);

    // Identity must NOT survive in any free-text clinical field.
    expect(context).not.toContain('Jackie Smith');
    expect(context).not.toMatch(/\bJackie\b/);
    expect(context).not.toMatch(/\bSmith\b/);
    expect(context).not.toContain('jackie.smith@example.com');

    // Replacement tag present.
    expect(context).toContain('[Client #42]');
  });

  it('PRESERVES the clinical language the coach AI needs (body-aware, identity-blind)', async () => {
    const sequelize = createSequelizeWithNameInFreeText();

    const context = await enrichWithUserData(42, 'trainer', 'coach_assistant', sequelize);

    // Clinical terms survive — we strip identity, not health data.
    expect(context).toContain('hypertension');
    expect(context).toContain('knee');
    expect(context).toContain('low-sodium');
    // Condition detection still fires off the raw text (HYPERTENSION protocol flag).
    expect(context).toContain('HYPERTENSION');
  });

  // ── FAIL-CLOSED regression (hostile-review PRIV-1/SEC-1/PII-1/TEST-2) ──
  // The slice's risk is fail-OPEN: if the identity lookup throws or returns 0
  // rows (dual users/"Users" drift), free-text fields used to reach Gemini RAW.
  function createSequelizeIdentityUnavailable({ mode } = {}) {
    const base = createSequelizeWithNameInFreeText();
    const original = base.query;
    base.query = vi.fn(async (sql, opts) => {
      if (sql.includes('"firstName"') && sql.includes('FROM "Users"')) {
        if (mode === 'throw') throw new Error('identity query failed (simulated DB hiccup)');
        return []; // 0 rows
      }
      return original(sql, opts);
    });
    return base;
  }

  it('FAILS CLOSED when the identity lookup returns 0 rows — names withheld, not leaked', async () => {
    const context = await enrichWithUserData(42, 'trainer', 'coach_assistant', createSequelizeIdentityUnavailable({ mode: 'empty' }));
    expect(context).not.toMatch(/\bJackie\b/);
    expect(context).not.toMatch(/\bSmith\b/);
    expect(context).not.toContain('low-sodium');         // raw free-text withheld
    expect(context).toContain('clinical note withheld');  // fail-closed placeholder
    expect(context).toContain('HYPERTENSION');            // non-identity flag still derived
  });

  it('FAILS CLOSED when the identity lookup throws — names withheld, not leaked', async () => {
    const context = await enrichWithUserData(42, 'trainer', 'coach_assistant', createSequelizeIdentityUnavailable({ mode: 'throw' }));
    expect(context).not.toMatch(/\bJackie\b/);
    expect(context).not.toMatch(/\bSmith\b/);
    expect(context).toContain('clinical note withheld');
    expect(context).toContain('HYPERTENSION');
  });
});
