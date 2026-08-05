/**
 * Slice 0 — source contracts for the gate-integrity fixes that live inside
 * heavy DB-bound modules (repo precedent: aiChatPainContextSource.test.mjs).
 * Each assertion reproduces an original verified failure by construction:
 * if the offending pattern returns, the contract fails.
 * Regression source: PAIN-CHART-UPGRADE-BLUEPRINT-2026-08-04 §3.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.resolve(here, '../../', rel), 'utf8');

describe('C2 — masterPromptBuilder pain query', () => {
  const src = read('services/masterPromptBuilder.mjs');

  it('filters pain entries to isActive: true (resolved entries must not read as active)', () => {
    const painBlock = src.match(/ClientPainEntry\?\.findAll\(\{[\s\S]*?\}\)/);
    expect(painBlock).not.toBeNull();
    expect(painBlock[0]).toContain('isActive: true');
  });

  it('injection-sanitizes the client-writable avoid/helps free text (F3)', () => {
    expect(src).toContain("import { sanitizeClientText } from './ai/clientTextSanitizer.mjs'");
    expect(src).toContain('avoid: sanitizeClientText(p.aggravatingMovements)');
    expect(src).toContain('helps: sanitizeClientText(p.relievingFactors)');
  });
});

describe('F3 — aiChatService pain description render', () => {
  const src = read('services/aiChatService.mjs');

  it('decrypts (raw SQL bypasses hooks), identity-strips, and wraps client description', () => {
    expect(src).toContain("import { wrapClientReported } from './ai/clientTextSanitizer.mjs'");
    expect(src).toContain("import { decrypt } from './encryption/encryptionService.mjs'");
    expect(src).toMatch(/wrapClientReported\(stripIdentityFromNotes\(decrypt\(p\.description, 'health:pain_entry'\)/);
  });
});

describe('F1 — chronic active severe pain must not age out of exclusion', () => {
  const src = read('services/clientIntelligenceService.mjs');

  it('the >=7 exclusion branch no longer requires the 72h recency window', () => {
    expect(src).not.toContain('severity >= PAIN_AUTO_EXCLUDE_SEVERITY && isRecent');
    expect(src).toContain('if (severity >= PAIN_AUTO_EXCLUDE_SEVERITY) {');
  });

  it('stale >=7 entries carry the re-confirmation reason', () => {
    expect(src).toContain('trainer re-confirmation recommended');
  });
});

describe('C9 — health encryption covers the REAL ClientPainEntry columns', () => {
  const src = read('services/encryption/healthDataEncryption.mjs');

  it('drops phantom columns and lists the actual sensitive free-text fields', () => {
    const block = src.match(/ClientPainEntry:\s*\{[\s\S]*?\}/);
    expect(block).not.toBeNull();
    expect(block[0]).not.toContain("'severity_notes'");
    expect(block[0]).not.toMatch(/'notes'/);
    for (const field of ['description', 'trainerNotes', 'aiNotes', 'aggravatingMovements', 'relievingFactors']) {
      expect(block[0]).toContain(`'${field}'`);
    }
  });
});

describe('C12 — admin intelligence pain alerts are roster-scoped for non-admins', () => {
  const src = read('services/clientIntelligenceService.mjs');

  it('non-admin callers get fail-closed roster scoping on the pain-alert query', () => {
    expect(src).toContain("export async function getAdminIntelligenceOverview(trainerId, { role = 'admin' } = {})");
    expect(src).toContain('painAlertRosterScope');
    expect(src).toContain('rosterIds.length ? rosterIds : [-1]');
    expect(src).toContain('...painAlertRosterScope,');
  });

  it('the route passes the caller role through', () => {
    const routeSrc = read('routes/clientIntelligenceRoutes.mjs');
    expect(routeSrc).toContain('getAdminIntelligenceOverview(trainerId, { role: req.user.role })');
  });
});

describe('C1 (copy honesty) — workout builder never claims exclusions it did not make', () => {
  const src = read('services/workoutBuilderService.mjs');

  it('pain_exclusion explanation distinguishes mapped vs unmapped regions', () => {
    expect(src).not.toContain('auto-excluded due to pain severity >= ${PAIN_AUTO_EXCLUDE_SEVERITY}/10 within 72h');
    expect(src).toContain('NO automatic muscle mapping yet');
    expect(src).toContain("[unmapped -- manual review]");
  });
});

describe('C3 — client self-service lane routes through the validated writer', () => {
  const src = read('services/ai/dispatchers/clientSelfServicePainDispatchers.mjs');

  it('dispatchTrackMyPain delegates to painWriteService.createPainEntry', () => {
    expect(src).toContain("import { createPainEntry } from '../painWriteService.mjs'");
    expect(src).not.toContain('ClientPainEntry.create({');
  });
});
