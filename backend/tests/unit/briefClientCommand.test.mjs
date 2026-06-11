/**
 * briefClientCommand.test.mjs
 * ===========================
 * Slice A1 — brief_client dispatcher behavior + wiring regression
 * (registry entry, dispatcher map, chat-lane hardening source guards).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCoachContext } from '../../services/ai/contextEngine/coachContextEngine.mjs';
import { dispatchBriefClient } from '../../services/ai/dispatchers/briefClientDispatcher.mjs';

vi.mock('../../services/ai/contextEngine/coachContextEngine.mjs', () => ({
  buildCoachContext: vi.fn(),
}));

const engineMock = vi.mocked(buildCoachContext);
const __dirname = dirname(fileURLToPath(import.meta.url));

const HEALTHY_CONTEXT = {
  ok: true,
  accessVia: 'assignment',
  aliasMap: { 'Client-7': 'Maria Lopez' },
  dataQuality: [{ domain: 'profile', status: 'ok' }, { domain: 'gamification', status: 'deferred' }],
  context: {
    clientAlias: 'Client-7',
    nasmPhase: 2,
    sessionCredits: 1,
    lastWorkoutDate: '2026-06-01',
    recentExercises: ['goblet squat', 'split squat'],
    goals: [{ title: 'Run 5k' }],
    painEntries: [{ bodyPart: 'knee', level: 'high', isActive: true }],
    schedule: { upcomingCount: 0, nextSessionDate: null, statuses: [] },
    workoutCount: 1,
  },
};

beforeEach(() => engineMock.mockReset());

describe('dispatchBriefClient', () => {
  it('returns a denied result when the engine denies access', async () => {
    engineMock.mockResolvedValue({ ok: false, deniedReason: 'not_assigned', message: 'denied msg' });
    const r = await dispatchBriefClient({ clientId: 7 }, { user: { id: 2, role: 'trainer' }, resolvedClient: { id: 7 }, options: {} });
    expect(r.type).toBe('client_brief_denied');
    expect(r.deniedReason).toBe('not_assigned');
  });

  it('formats a brief with attention flags (pain, credits, no sessions)', async () => {
    engineMock.mockResolvedValue(HEALTHY_CONTEXT);
    const r = await dispatchBriefClient({ clientId: 7 }, { user: { id: 1, role: 'admin' }, resolvedClient: { id: 7 }, options: {} });

    expect(r.type).toBe('client_brief');
    expect(r.message).toContain('Client-7');
    expect(r.message).toContain('knee');
    expect(r.message).toContain('session credits low');
    expect(r.message).toContain('no upcoming sessions booked');
    expect(r.brief.flags.length).toBeGreaterThanOrEqual(3);
    // De-identified: real name never appears in the brief output
    expect(r.message).not.toContain('Maria');
  });

  it('prefers the pipeline-resolved client id over raw params', async () => {
    engineMock.mockResolvedValue(HEALTHY_CONTEXT);
    await dispatchBriefClient({ clientId: 999 }, { user: { id: 1, role: 'admin' }, resolvedClient: { id: 7 }, options: { sequelize: 'SQZ' } });
    expect(engineMock).toHaveBeenCalledWith({ user: { id: 1, role: 'admin' }, targetClientId: 7, sequelize: 'SQZ' });
  });
});

describe('wiring regression (source guards)', () => {
  const REGISTRY_SRC = readFileSync(resolve(__dirname, '../../services/ai/commandRegistry/dashboardCommands.mjs'), 'utf8');
  const DISPATCHER_SRC = readFileSync(resolve(__dirname, '../../services/ai/commandDispatcher.mjs'), 'utf8');
  const CHAT_SRC = readFileSync(resolve(__dirname, '../../routes/aiChatRoutes.mjs'), 'utf8');

  it('brief_client is registered read-only for admin+trainer with client ref', () => {
    expect(REGISTRY_SRC).toMatch(/type: 'brief_client'/);
    const entry = REGISTRY_SRC.slice(REGISTRY_SRC.indexOf("type: 'brief_client'"), REGISTRY_SRC.indexOf("type: 'view_recent_signups'"));
    expect(entry).toMatch(/destructive: false/);
    expect(entry).toMatch(/requiresConfirmation: false/);
    expect(entry).toMatch(/roleRequired: \['admin', 'trainer'\]/);
    expect(entry).toMatch(/requiresClientRef: true/);
  });

  it('brief_client has a dispatcher map entry', () => {
    expect(DISPATCHER_SRC).toMatch(/\['brief_client', dispatchBriefClient\]/);
  });

  it('chat lane uses the fail-closed gate — soft warn-and-continue is gone', () => {
    expect(CHAT_SRC).toMatch(/checkClientAccess/);
    expect(CHAT_SRC).toMatch(/CLIENT_ACCESS_DENIED/);
    expect(CHAT_SRC).toMatch(/AI_CHAT_CLIENT_ACCESS_SOFT/);
    expect(CHAT_SRC).not.toMatch(/no session relationship found/);
    expect(CHAT_SRC).not.toMatch(/Soft check — log warning but allow/);
  });
});
