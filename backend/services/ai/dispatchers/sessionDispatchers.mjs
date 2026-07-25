/**
 * ============================================================================
 * FILE: dispatchers/sessionDispatchers.mjs
 * PURPOSE: Dispatcher handlers for session-domain AI commands
 * OWNER: Claude Sonnet 4.6 | CREATED: 2026-04-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Houses the session-domain command handlers.
 * Extracted into dispatchers/ to keep commandDispatcher.mjs under the
 * 300-line ceiling per project rules.
 *
 * COMMANDS:
 *   S01: dispatchCancelSession (v9) — first live destructive trainer slice
 *        Supports two targeting modes:
 *          1. Direct by sessionId
 *          2. Resolution by clientId + date (must match exactly one session)
 *
 *   T01: dispatchViewTodaySchedule (v10) — flat scalar summary of today's schedule
 *        Role-aware: trainer filters by trainerId; admin sees all.
 *        Status filter mirrors live scheduleController: ['scheduled','confirmed','completed']
 *
 *   T02: dispatchViewWeekSchedule (v10) — 7-day window (today through today+6, UTC)
 *        Same role-aware filter and status set. Returns daysWithSessions, first slot.
 *
 * RESOLUTION CONTRACT (cancel):
 *   - Zero matching sessions  → honest error, nothing cancelled
 *   - Multiple sessions       → honest ambiguity error, nothing cancelled
 *   - Exactly one session     → delegates to sessionCancelService
 *
 * BUSINESS SEMANTICS:
 *   Delegates to sessionCancelService.cancelSessionForAI which mirrors the live
 *   PATCH /:sessionId/cancel route (chargeType: 'none', idempotent credit restore,
 *   late-cancellation MindBody parity, correct notifications).
 */

import { Op } from 'sequelize';
import { getSession } from '../../../models/index.mjs';
import { cancelSessionForAI } from '../../sessions/sessionCancelService.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

// ── Constants ────────────────────────────────────────────────────────────────

const CANCELLABLE_STATUSES = ['scheduled', 'confirmed', 'requested'];

// Mirrors live scheduleController.mjs status filter — must stay in sync
const SCHEDULE_STATUSES = ['scheduled', 'confirmed', 'completed'];

// ── S01: cancel_session ───────────────────────────────────────────────────────

/**
 * Dispatcher for the cancel_session command.
 * Resolves the target session from params, then delegates to cancelSessionForAI.
 *
 * @param {{ sessionId?: number, clientId?: number, date?: string }} params
 * @param {{ user: object }} ctx
 * @returns {Promise<{
 *   sessionId, status, cancellationDate, refundIssued, cancelledBy,
 *   isLateCancellation, requiresAdminReview
 * }>}
 */
export async function dispatchCancelSession(params, ctx) {
  const { sessionId, date } = params;
  // The selected client always wins over the classifier-extracted one — cancelling
  // is destructive, so a misparsed client reference must never pick the session.
  const clientId = resolveCommandClientId(params, ctx);

  // ── Path A: direct by sessionId ─────────────────────────────────────────

  if (sessionId != null) {
    return cancelSessionForAI(sessionId, ctx.user);
  }

  // ── Path B: resolve by clientId + date ──────────────────────────────────

  if (clientId == null || date == null) {
    throw new Error(
      'To cancel a session, provide either a sessionId or both clientId and date. ' +
      'Example: "cancel session 123" or "cancel Alex\'s session on 2026-04-15".'
    );
  }

  // Build day-range bounds from the date string (UTC day boundaries)
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd   = new Date(`${date}T23:59:59.999Z`);

  if (isNaN(dayStart.getTime())) {
    throw new Error(`Invalid date: "${date}". Expected format: YYYY-MM-DD.`);
  }

  const Session = getSession();

  const matches = await Session.findAll({
    where: {
      userId: clientId,
      sessionDate: {
        [Op.gte]: dayStart,
        [Op.lte]: dayEnd,
      },
      status: { [Op.in]: CANCELLABLE_STATUSES },
    },
    attributes: ['id', 'sessionDate', 'status'],
  });

  if (matches.length === 0) {
    throw new Error(
      `No cancellable session found for client ${clientId} on ${date}. ` +
      `Sessions must be in status: ${CANCELLABLE_STATUSES.join(', ')}.`
    );
  }

  if (matches.length > 1) {
    const ids = matches.map(s => `#${s.id}`).join(', ');
    throw new Error(
      `Multiple sessions found for client ${clientId} on ${date} (${ids}). ` +
      `Specify a sessionId to cancel a specific session. ` +
      `Example: "cancel session ${matches[0].id}".`
    );
  }

  return cancelSessionForAI(matches[0].id, ctx.user);
}

// ── T01: view_today_schedule ─────────────────────────────────────────────────

/**
 * Flat scalar summary of today's sessions for the calling trainer (or all sessions
 * for admins). Status filter mirrors live scheduleController.mjs.
 *
 * @param {{ date?: string }} params - Optional YYYY-MM-DD override (defaults to today UTC)
 * @param {{ user: { id: number, role: string } }} ctx
 * @returns {Promise<{
 *   count, date, scheduledCount, confirmedCount, completedCount,
 *   nextSessionTime, sessionIds
 * }>}
 */
export async function dispatchViewTodaySchedule(params, ctx) {
  const dateStr = (typeof params?.date === 'string' && params.date)
    ? params.date
    : new Date().toISOString().slice(0, 10);

  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd   = new Date(`${dateStr}T23:59:59.999Z`);

  if (isNaN(dayStart.getTime())) {
    throw new Error(`Invalid date: "${params?.date}". Expected format: YYYY-MM-DD.`);
  }

  const Session = getSession();
  const isAdmin = ctx.user.role === 'admin';

  const rows = await Session.findAll({
    where: {
      sessionDate: { [Op.gte]: dayStart, [Op.lte]: dayEnd },
      status:      { [Op.in]: SCHEDULE_STATUSES },
      ...(isAdmin ? {} : { trainerId: ctx.user.id }),
    },
    attributes: ['id', 'sessionDate', 'status'],
    order: [['sessionDate', 'ASC']],
  });

  const now = new Date();
  const nextRow = rows.find(r =>
    r.status !== 'completed' && r.sessionDate && new Date(r.sessionDate) > now
  );
  const nextSessionTime = nextRow
    ? new Date(nextRow.sessionDate).toISOString().slice(11, 16)   // HH:MM UTC
    : null;

  // Cap at 10 IDs for flat rendering
  const sessionIds = rows.slice(0, 10).map(r => r.id).join(',');

  return {
    count:           rows.length,
    date:            dateStr,
    scheduledCount:  rows.filter(r => r.status === 'scheduled').length,
    confirmedCount:  rows.filter(r => r.status === 'confirmed').length,
    completedCount:  rows.filter(r => r.status === 'completed').length,
    nextSessionTime,
    sessionIds,
  };
}

// ── T02: view_week_schedule ───────────────────────────────────────────────────

/**
 * Flat scalar summary of the 7-day window (today through today+6, UTC) for the
 * calling trainer (or all sessions for admins).
 *
 * @param {object} _params - Unused; date window always relative to today UTC
 * @param {{ user: { id: number, role: string } }} ctx
 * @returns {Promise<{
 *   sessionCount, startDate, endDate, daysWithSessions,
 *   firstSessionDate, firstSessionTime
 * }>}
 */
export async function dispatchViewWeekSchedule(_params, ctx) {
  const todayD = new Date();
  todayD.setUTCHours(0, 0, 0, 0);

  const endD = new Date(todayD);
  endD.setUTCDate(endD.getUTCDate() + 6);
  endD.setUTCHours(23, 59, 59, 999);

  const startDate = todayD.toISOString().slice(0, 10);
  const endDate   = endD.toISOString().slice(0, 10);

  const Session = getSession();
  const isAdmin = ctx.user.role === 'admin';

  const rows = await Session.findAll({
    where: {
      sessionDate: { [Op.gte]: todayD, [Op.lte]: endD },
      status:      { [Op.in]: SCHEDULE_STATUSES },
      ...(isAdmin ? {} : { trainerId: ctx.user.id }),
    },
    attributes: ['id', 'sessionDate', 'status'],
    order: [['sessionDate', 'ASC']],
  });

  const distinctDays = new Set(
    rows
      .filter(r => r.sessionDate)
      .map(r => new Date(r.sessionDate).toISOString().slice(0, 10))
  ).size;

  const first = rows[0];

  return {
    sessionCount:     rows.length,
    startDate,
    endDate,
    daysWithSessions: distinctDays,
    firstSessionDate: first ? new Date(first.sessionDate).toISOString().slice(0, 10) : null,
    firstSessionTime: first ? new Date(first.sessionDate).toISOString().slice(11, 16) : null,
  };
}
