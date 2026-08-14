/**
 * ============================================================================
 * FILE: groupParticipantAuthzExecution.test.mjs
 * PURPOSE: Drive the REAL messaging participant routes and prove that user A
 *          cannot promote, demote, or eject user B from a group A does not run.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-14 (executed-authz coverage slice)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * This is the crossing the authorization review was opened for: "can user A
 * remove user B from a conversation A does not own?" That question was answered
 * by HAND-TRACING groupController.mjs. Tracing is reading, and reading is not
 * running — a handler can be traced correct and still be wired to a router that
 * never calls it, or called with params the trace assumed were validated.
 *
 * These two handlers are also the weakest clearances in the whole static audit.
 * `audit-idor-surface.mjs` clears them "INDIRECT — controller
 * groupController.mjs:updateParticipantRole / :removeConversationParticipant" —
 * i.e. only by following a function out of messagingRoutes.mjs, through the
 * messagingController.mjs barrel, into a third file. Every hop is a chance to be
 * wrong, and the audit's own footer says a passing handler is not proven safe.
 *
 * SUBJECT vs SCAFFOLD
 * `services/messagingGroupPolicy.mjs` is deliberately NOT mocked — canRemoveParticipant
 * and canManageParticipantRole ARE the authorization decision. Only the data layer
 * (messagingRepository) and the auth/tier middleware are stubbed.
 *
 * CONTROLS ARE MANDATORY. Every denial below is paired with a permit that must
 * succeed. Without them, an all-403 suite passes just as happily against a route
 * that is broken shut, a tier gate that rejects everyone, or a harness that never
 * reached the handler. Payloads are always VALID, so a 403 can never be a
 * validation rejection wearing a denial's clothes.
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const CONVO = 4242;
const OWNER = { id: 501, role: 'user' };
const GROUP_ADMIN = { id: 502, role: 'user' };
const MEMBER = { id: 503, role: 'user' };
const OUTSIDER = { id: 504, role: 'user' };
const TARGET_MEMBER_ID = 505;

const repo = vi.hoisted(() => ({
  ensureMessagingTables: vi.fn(async () => {}),
  fetchActiveUserIds: vi.fn(async (ids) => ids.map(Number)),
  getActiveParticipant: vi.fn(),
  getConversationForViewer: vi.fn(async () => ({ id: CONVO, type: 'group', name: 'Swan Family' })),
  getConversationMembership: vi.fn(),
  renameConversation: vi.fn(async () => {}),
  softDeleteParticipant: vi.fn(async () => {}),
  touchConversation: vi.fn(async () => {}),
  updateParticipantRoleRecord: vi.fn(async () => {}),
  upsertConversationParticipant: vi.fn(async () => {}),
  sequelize: { transaction: vi.fn(async () => ({ commit: vi.fn(), rollback: vi.fn() })) },
}));

vi.mock('../../services/messagingRepository.mjs', () => repo);

let currentUser = OWNER;
vi.mock('../../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...currentUser }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));

// The tier gate is scaffold, not subject. Leaving it live would make every
// assertion below a test of requireTier instead of a test of group policy.
vi.mock('../../middleware/requireTier.mjs', () => ({
  requireTier: () => (_req, _res, next) => next(),
  requireFeature: () => (_req, _res, next) => next(),
}));

const messagingRoutes = (await import('../../routes/messagingRoutes.mjs')).default;

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/messaging', messagingRoutes);
  return a;
}

/** actor's own membership row, as messagingRepository would return it */
const membership = (viewerRole, type = 'group') => ({ id: CONVO, type, viewerRole });
/** the row for the person being acted upon */
const participant = (role) => ({ conversationId: CONVO, userId: TARGET_MEMBER_ID, role });

const removePath = (userId) => `/api/messaging/conversations/${CONVO}/participants/${userId}`;

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = OWNER;
  repo.ensureMessagingTables.mockResolvedValue(undefined);
  repo.touchConversation.mockResolvedValue(undefined);
  repo.softDeleteParticipant.mockResolvedValue(undefined);
  repo.updateParticipantRoleRecord.mockResolvedValue(undefined);
  repo.getConversationForViewer.mockResolvedValue({ id: CONVO, type: 'group', name: 'Swan Family' });
});

describe('DELETE participant — ejecting someone from a group you do not run', () => {
  it('an OUTSIDER (not in the conversation) gets 404, and no removal is attempted', async () => {
    currentUser = OUTSIDER;
    repo.getConversationMembership.mockResolvedValue(null);
    repo.getActiveParticipant.mockResolvedValue(participant('member'));

    const res = await request(app()).delete(removePath(TARGET_MEMBER_ID));

    expect(res.status).toBe(404);
    // The denial must not confirm the group exists or leak who is in it.
    expect(JSON.stringify(res.body)).not.toContain(String(TARGET_MEMBER_ID));
    expect(repo.softDeleteParticipant).not.toHaveBeenCalled();
  });

  it('a PLAIN MEMBER cannot eject another member', async () => {
    currentUser = MEMBER;
    repo.getConversationMembership.mockResolvedValue(membership('member'));
    repo.getActiveParticipant.mockResolvedValue(participant('member'));

    const res = await request(app()).delete(removePath(TARGET_MEMBER_ID));

    expect(res.status).toBe(403);
    expect(repo.softDeleteParticipant).not.toHaveBeenCalled();
  });

  it('a group ADMIN cannot eject a fellow ADMIN (admins outrank members only)', async () => {
    currentUser = GROUP_ADMIN;
    repo.getConversationMembership.mockResolvedValue(membership('admin'));
    repo.getActiveParticipant.mockResolvedValue(participant('admin'));

    const res = await request(app()).delete(removePath(TARGET_MEMBER_ID));

    expect(res.status).toBe(403);
    expect(repo.softDeleteParticipant).not.toHaveBeenCalled();
  });

  it('NOBODY can eject the OWNER — not even the owner themselves', async () => {
    currentUser = OWNER;
    repo.getConversationMembership.mockResolvedValue(membership('owner'));
    repo.getActiveParticipant.mockResolvedValue({ ...participant('owner'), userId: OWNER.id });

    const res = await request(app()).delete(removePath(OWNER.id));

    expect(res.status).toBe(403);
    expect(repo.softDeleteParticipant).not.toHaveBeenCalled();
  });

  it('a role the policy does not recognise is treated as MEMBER, not as privileged', async () => {
    // normalizeGroupRole fails closed to 'member'. A junk role arriving from a
    // drifted DB column must not become an escalation.
    currentUser = MEMBER;
    repo.getConversationMembership.mockResolvedValue(membership('superadmin'));
    repo.getActiveParticipant.mockResolvedValue(participant('member'));

    const res = await request(app()).delete(removePath(TARGET_MEMBER_ID));

    expect(res.status).toBe(403);
    expect(repo.softDeleteParticipant).not.toHaveBeenCalled();
  });

  it('CONTROL — the OWNER can eject a member (the denials above are not blanket)', async () => {
    currentUser = OWNER;
    repo.getConversationMembership.mockResolvedValue(membership('owner'));
    repo.getActiveParticipant.mockResolvedValue(participant('member'));

    const res = await request(app()).delete(removePath(TARGET_MEMBER_ID));

    expect(res.status).toBeLessThan(400);
    expect(repo.softDeleteParticipant).toHaveBeenCalledWith(CONVO, TARGET_MEMBER_ID);
  });

  it('CONTROL — a group ADMIN can eject a plain member', async () => {
    currentUser = GROUP_ADMIN;
    repo.getConversationMembership.mockResolvedValue(membership('admin'));
    repo.getActiveParticipant.mockResolvedValue(participant('member'));

    const res = await request(app()).delete(removePath(TARGET_MEMBER_ID));

    expect(res.status).toBeLessThan(400);
    expect(repo.softDeleteParticipant).toHaveBeenCalledWith(CONVO, TARGET_MEMBER_ID);
  });

  it('CONTROL — a plain member may remove THEMSELVES (leaving is not ejection)', async () => {
    currentUser = MEMBER;
    repo.getConversationMembership.mockResolvedValue(membership('member'));
    repo.getActiveParticipant.mockResolvedValue({ ...participant('member'), userId: MEMBER.id });

    const res = await request(app()).delete(removePath(MEMBER.id));

    expect(res.status).toBeLessThan(400);
    expect(repo.softDeleteParticipant).toHaveBeenCalledWith(CONVO, MEMBER.id);
  });
});

describe('PATCH participant role — promotion is owner-only', () => {
  const promote = (userId, role = 'admin') =>
    request(app()).patch(removePath(userId)).send({ role });

  it('an OUTSIDER gets 404 and no role is written', async () => {
    currentUser = OUTSIDER;
    repo.getConversationMembership.mockResolvedValue(null);
    repo.getActiveParticipant.mockResolvedValue(participant('member'));

    const res = await promote(TARGET_MEMBER_ID);

    expect(res.status).toBe(404);
    expect(repo.updateParticipantRoleRecord).not.toHaveBeenCalled();
  });

  it('a PLAIN MEMBER cannot promote anyone', async () => {
    currentUser = MEMBER;
    repo.getConversationMembership.mockResolvedValue(membership('member'));
    repo.getActiveParticipant.mockResolvedValue(participant('member'));

    const res = await promote(TARGET_MEMBER_ID);

    expect(res.status).toBe(403);
    expect(repo.updateParticipantRoleRecord).not.toHaveBeenCalled();
  });

  it('a group ADMIN cannot promote — this endpoint is OWNER-only, unlike removal', async () => {
    // The sharp asymmetry: an admin CAN eject a member (control above) but CANNOT
    // mint another admin. If these two ever collapse to the same gate, an admin
    // could self-perpetuate the admin set. This test is what keeps them apart.
    currentUser = GROUP_ADMIN;
    repo.getConversationMembership.mockResolvedValue(membership('admin'));
    repo.getActiveParticipant.mockResolvedValue(participant('member'));

    const res = await promote(TARGET_MEMBER_ID);

    expect(res.status).toBe(403);
    expect(repo.updateParticipantRoleRecord).not.toHaveBeenCalled();
  });

  it('the OWNER cannot be demoted through this endpoint', async () => {
    currentUser = OWNER;
    repo.getConversationMembership.mockResolvedValue(membership('owner'));
    repo.getActiveParticipant.mockResolvedValue({ ...participant('owner'), userId: OWNER.id });

    const res = await promote(OWNER.id, 'member');

    expect(res.status).toBe(400);
    expect(repo.updateParticipantRoleRecord).not.toHaveBeenCalled();
  });

  it('CONTROL — the OWNER can promote a member to admin', async () => {
    currentUser = OWNER;
    repo.getConversationMembership.mockResolvedValue(membership('owner'));
    repo.getActiveParticipant.mockResolvedValue(participant('member'));

    const res = await promote(TARGET_MEMBER_ID);

    expect(res.status).toBeLessThan(400);
    expect(repo.updateParticipantRoleRecord).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: CONVO, userId: TARGET_MEMBER_ID, role: 'admin' }),
    );
  });
});

describe('the group gates cannot be reached on a non-group conversation', () => {
  it('a DIRECT conversation refuses participant removal even for its owner', async () => {
    currentUser = OWNER;
    repo.getConversationMembership.mockResolvedValue(membership('owner', 'direct'));
    repo.getActiveParticipant.mockResolvedValue(participant('member'));

    const res = await request(app()).delete(removePath(TARGET_MEMBER_ID));

    expect(res.status).toBe(400);
    expect(repo.softDeleteParticipant).not.toHaveBeenCalled();
  });
});
