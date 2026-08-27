import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '../..', '..');
const read = (relativePath) => readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('CommunicationDraft canonical registration', () => {
  it('is registered in the canonical model cache and used by its controller', () => {
    const associations = read('backend/models/associations.mjs');
    const modelIndex = read('backend/models/index.mjs');
    const controller = read('backend/controllers/communicationDraftController.mjs');

    expect(associations).toMatch(/const CommunicationDraftModule = await import\('\.\/CommunicationDraft\.mjs'\);/);
    expect(associations).toMatch(/const CommunicationDraft = CommunicationDraftModule\.default;/);
    expect(associations).toMatch(/CommunicationDraft,?[\s\S]*CommunicationAuditLog/);
    expect(modelIndex).toMatch(/export const getCommunicationDraft = \(\) => getModel\('CommunicationDraft'\);/);
    expect(controller).toMatch(/import \{ getCommunicationDraft \} from '\.\.\/models\/index\.mjs';/);
    expect(controller).toMatch(/return getCommunicationDraft\(\);/);
    expect(controller).not.toMatch(/import\('\.\.\/models\/CommunicationDraft\.mjs'\)/);
  });

  it('mounts the draft route once and remains trainer/admin protected', () => {
    const coreRoutes = read('backend/core/routes.mjs');
    const route = read('backend/routes/communicationDraftRoutes.mjs');
    const associations = read('backend/models/associations.mjs');

    expect((coreRoutes.match(/app\.use\('\/api\/trainer\/drafts', communicationDraftRoutes\)/g) || []).length).toBe(1);
    expect(route).toMatch(/router\.use\(protect\);/);
    expect(route).toMatch(/router\.use\(authorize\(\['trainer', 'admin'\]\)\);/);
    expect(route).toMatch(/router\.get\('\/', listDrafts\);/);
    expect(route).toMatch(/router\.post\('\/:draftId\/approve', approveDraft\);/);
    expect(route).toMatch(/router\.post\('\/:draftId\/reject', rejectDraft\);/);
    expect(route).toMatch(/router\.delete\('\/:draftId', deleteDraft\);/);
    expect(associations).toMatch(/CommunicationDraft\.belongsTo\(User, \{ foreignKey: 'clientId', as: 'client' \}\);/);
    expect(associations).toMatch(/CommunicationDraft\.belongsTo\(User, \{ foreignKey: 'trainerId', as: 'trainer' \}\);/);
    expect(associations).toMatch(/CommunicationDraft\.belongsTo\(User, \{ foreignKey: 'approvedBy', as: 'approver' \}\);/);
  });
});
