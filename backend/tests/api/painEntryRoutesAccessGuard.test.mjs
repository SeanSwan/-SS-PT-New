import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/painEntryRoutes.mjs'), 'utf8');
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/painEntryController.mjs'), 'utf8');
const modelSource = readFileSync(resolve(__dirname, '../../models/ClientPainEntry.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('pain entry route access guard', () => {
  it('keeps every /api/pain-entries/:userId path behind assignment-or-self access', () => {
    expect(coreRoutesSource).toContain("app.use('/api/pain-entries', painEntryRoutes)");
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");
    expect(routeSource).toContain("router.get('/:userId', verifyClientAccessByUserId({ paramName: 'userId' }), getClientPainEntries)");
    expect(routeSource).toContain("router.get('/:userId/active', verifyClientAccessByUserId({ paramName: 'userId' }), getActivePainEntries)");
    expect(routeSource).toContain("router.post('/:userId', authorize(['admin', 'trainer', 'client']), verifyClientAccessByUserId({ paramName: 'userId' }), createPainEntry)");
    expect(routeSource).toContain("router.put('/:userId/:entryId', authorize(['admin', 'trainer', 'client']), verifyClientAccessByUserId({ paramName: 'userId' }), updatePainEntry)");
    expect(routeSource).toContain("router.put('/:userId/:entryId/resolve', authorize(['admin', 'trainer', 'client']), verifyClientAccessByUserId({ paramName: 'userId' }), resolvePainEntry)");
    expect(routeSource).toContain("router.delete('/:userId/:entryId', authorize(['admin']), verifyClientAccessByUserId({ paramName: 'userId' }), deletePainEntry)");
  });

  it('does not expose trainer-only pain-entry fields to client-role responses', () => {
    expect(modelSource).toContain("comment: 'Internal trainer/admin notes");
    expect(controllerSource).toContain('const sanitizePainEntryForRequester = (entry, requester) => {');
    // Launch audit 2026-08-04: this assertion used to pin
    //   if (requester?.role !== 'client')
    // which meant the test was PROTECTING A BUG — it returned the UNREDACTED
    // entry to every role that was not literally 'client'. The default
    // public-signup role is 'user', and the route gate correctly admits
    // 'user' for self-access, so a normal member read their own
    // trainer-private clinical notes while this green test claimed otherwise.
    // Redaction is now fail-closed: only explicit staff roles see the full row.
    expect(controllerSource).toContain("const STAFF_ROLES = new Set(['trainer', 'admin'])");
    expect(controllerSource).toContain('if (STAFF_ROLES.has(requester?.role))');
    expect(controllerSource).not.toContain("if (requester?.role !== 'client')");
    expect(controllerSource).toContain('delete data.trainerNotes;');
    expect(controllerSource).toContain('delete data.aiNotes;');
    expect(controllerSource).toContain('delete data.posturalSyndrome;');
    expect(controllerSource).toContain('delete data.assessmentFindings;');
    expect(controllerSource).toContain('entries.map((entry) => sanitizePainEntryForRequester(entry, requester))');
    expect(controllerSource).toContain('data: sanitizePainEntryForRequester(entry, requester)');
  });

  it('uses strict positive-integer IDs and strict pain-level parsing', () => {
    expect(controllerSource).toContain('const parsePositiveInt = (value) => {');
    expect(controllerSource).toContain('return Number.isInteger(parsed) && parsed > 0 ? parsed : null;');
    expect(controllerSource).toContain('const parsePainLevel = (value) => {');
    expect(controllerSource).toContain('return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : null;');
  });
});
