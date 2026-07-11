/**
 * Automation Service
 * ==================
 * Orchestrates outbound automation sequences (SMS/email/push).
 */

import logger from '../utils/logger.mjs';
import { Op } from 'sequelize';
import { getAllModels } from '../models/index.mjs';
import { sendTemplatedSMS, sendSmsMessage } from './smsService.mjs';
import { sendTemplatedEmail, buildNurtureEmailVars } from './emailTemplateService.mjs';

// Consent gate is CHANNEL-SCOPED: an EMAIL send is gated only by email opt-out (Subscriber
// unsubscribe); it must NOT be blocked by SMS-consent state (a contact-form lead defaults
// smsConsentStatus:'unknown' and can never SMS-opt-in — that would cancel every email nurture).
// SMS keeps the full email+phone+lead consent check.
const resolveChannelSuppression = (log, target) => resolveMarketingSuppression(
  log?.channel === 'email'
    ? { email: target?.email }
    : { email: target?.email, phone: target?.phone, leadId: target?.leadId }
);

// Channel-agnostic reason → human message, so a cancelled/failed EMAIL log is never mislabeled
// with SMS/phone-specific copy (covers email_disabled, no_email, and the lead-consent reasons).
const REASON_MESSAGES = {
  unsubscribed: 'Recipient unsubscribed (marketing-suppressed)',
  marketing_suppressed: 'Recipient unsubscribed (marketing-suppressed)',
  sms_opt_out: 'Recipient opted out of SMS',
  lead_sms_opt_out: 'Recipient opted out of SMS',
  lead_sms_consent_missing: 'Lead SMS consent missing',
  sms_disabled: 'SMS disabled for recipient',
  email_disabled: 'Email disabled for recipient',
  channel_not_implemented: 'Channel not implemented',
  suppression_unverified: 'Suppression status could not be verified',
  no_phone: 'Recipient missing phone number',
  no_email: 'Recipient missing email address',
};
const reasonMessage = (reason, fallback) => REASON_MESSAGES[reason] || fallback;
import { evaluateScheduledMessage } from './automationDecisionService.mjs';
import { resolveMarketingSuppression } from './marketingSuppressionService.mjs';
import { isAutomationArmed } from './automationArmState.mjs';
import { sendNurtureTestMessage } from './nurtureTestSendService.mjs';

const DEFAULT_SEQUENCES = [
  {
    name: 'new_client_welcome',
    triggerEvent: 'client_created',
    steps: [
      { dayOffset: 0, templateName: 'welcome', channel: 'sms' }
    ]
  },
  {
    name: 'post_session_followup',
    triggerEvent: 'session_completed',
    steps: [
      { dayOffset: 1, templateName: 'follow_up_day1', channel: 'sms' }
    ]
  },
  {
    name: 'new_client_nurture',
    triggerEvent: 'client_created',
    steps: [
      { dayOffset: 1, templateName: 'follow_up_day1', channel: 'sms' },
      { dayOffset: 3, templateName: 'follow_up_day3', channel: 'sms' },
      { dayOffset: 7, templateName: 'follow_up_day7', channel: 'sms' }
    ]
  },
  {
    // Triggered when a prospect Lead is captured (contact form / confirmed newsletter).
    // EMAIL channel: reaches the email-only prospects that make up most contact-form
    // traffic (the email-channel sender now exists — emailTemplateService.mjs). Still
    // seeded isActive:false ON PURPOSE so capture creates ZERO sends until Sean explicitly
    // ARMS it — flip isActive=true on the seeded row AND set SWAN_AUTOMATION_CRON_ENABLED —
    // AFTER the deliverability proof (SPF/DKIM/DMARC + inbox test) passes. Day 0/1/3/7.
    name: 'lead_nurture',
    triggerEvent: 'lead_captured',
    isActive: false,
    steps: [
      { dayOffset: 0, templateName: 'welcome', channel: 'email' },
      { dayOffset: 1, templateName: 'follow_up_day1', channel: 'email' },
      { dayOffset: 3, templateName: 'follow_up_day3', channel: 'email' },
      { dayOffset: 7, templateName: 'follow_up_day7', channel: 'email' }
    ]
  }
];

const getModels = () => {
  const models = getAllModels();
  const { AutomationSequence, AutomationLog, User } = models;
  if (!AutomationSequence || !AutomationLog) {
    throw new Error('Automation models not initialized');
  }
  return { AutomationSequence, AutomationLog, User };
};

/**
 * Resolve the recipient (user OR captured lead) for a scheduled log into a normalized
 * target `{ kind, phone, email, notificationPreferences }`. Leads carry no per-channel
 * prefs (null → defaults on); consent for leads is enforced by suppression + phone
 * presence. Returns null for an orphaned log (recipient row gone) → the evaluator then
 * fails it on no_phone. One log is user XOR lead (see triggerSequence).
 */
const resolveAutomationTarget = async (log, { User }) => {
  if (log.userId) {
    const user = await User.findByPk(log.userId);
    if (!user) return null;
    return { kind: 'user', phone: user.phone, email: user.email, leadId: null, notificationPreferences: user.notificationPreferences };
  }
  if (log.leadId) {
    const { default: Lead } = await import('../models/Lead.mjs');
    const lead = await Lead.findByPk(log.leadId);
    if (!lead) return null;
    return { kind: 'lead', phone: lead.phone, email: lead.email, leadId: lead.id, notificationPreferences: null };
  }
  return null;
};

// Rolling per-recipient frequency cap (anti-spam). Conservative defaults — overridable
// via env. Counts automation messages already SENT to this recipient in the window;
// at/over the cap the message DEFERS by a cooldown (re-tried next tick, never dropped).
// Validate-then-fallback (NOT `|| default`): so an explicit 0 is honored as a true halt,
// and a typo/NaN/negative falls back to the conservative default rather than silently
// becoming it or passing through unguarded.
const envNonNegInt = (name, fallback) => {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return fallback; // blank/unset → fallback (Number('')===0 would slip through)
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};
const FREQ_CAP = envNonNegInt('SWAN_AUTOMATION_MAX_PER_WINDOW', 3);
const FREQ_WINDOW_DAYS = envNonNegInt('SWAN_AUTOMATION_WINDOW_DAYS', 7);
const FREQ_COOLDOWN_HOURS = envNonNegInt('SWAN_AUTOMATION_COOLDOWN_HOURS', 24);
const DAY_MS = 24 * 60 * 60 * 1000;
// A log claimed ('processing') but never resolved this long ago was stranded by a crashed
// mid-send; it becomes reclaimable so it isn't stuck forever (and stops permanently
// counting against its recipient's cap). Far longer than any real SMS send (seconds).
const CLAIM_STALE_MS = 15 * 60 * 1000;

const resolveFrequencyCap = async (log, { AutomationLog }, now, target = null) => {
  const base = { capped: false, sentInWindow: 0, cap: FREQ_CAP, windowDays: FREQ_WINDOW_DAYS };
  const identityClauses = [];
  if (log.userId) identityClauses.push({ userId: log.userId });
  if (log.leadId) identityClauses.push({ leadId: log.leadId });
  const recipient = target?.phone || log.recipient;
  if (recipient) identityClauses.push({ recipient });
  if (!identityClauses.length) return base; // no resolvable recipient -> nothing to cap

  // Count what counts against the cap for this recipient: already-sent within the rolling
  // window, PLUS any in-flight ('processing') peer a concurrent runner just claimed —
  // EXCLUDING this log. Counting in-flight peers makes the cap concurrency-safe (under a
  // race it errs toward DEFER, never toward exceeding the cap).
  const where = {
    [Op.and]: [
      { [Op.or]: identityClauses },
      {
        [Op.or]: [
          { status: 'sent', sentAt: { [Op.gte]: new Date(now.getTime() - FREQ_WINDOW_DAYS * DAY_MS) } },
          { status: 'processing' },
        ],
      },
    ],
  };
  if (log.id != null) where.id = { [Op.ne]: log.id };

  const sentInWindow = await AutomationLog.count({ where });
  return {
    ...base,
    sentInWindow,
    capped: sentInWindow >= FREQ_CAP,
    nextAttempt: new Date(now.getTime() + FREQ_COOLDOWN_HOURS * 60 * 60 * 1000),
  };
};

export const ensureDefaultSequences = async () => {
  const { AutomationSequence } = getModels();

  // Idempotent ensure-by-name: create any missing default, leave existing rows (and any
  // manual isActive/steps edits) untouched. Replaces the old all-or-nothing count gate,
  // which silently skipped NEW defaults once the table had been seeded once.
  let created = 0;
  for (const seq of DEFAULT_SEQUENCES) {
    const [, wasCreated] = await AutomationSequence.findOrCreate({ where: { name: seq.name }, defaults: seq });
    if (wasCreated) created += 1;
  }

  const count = await AutomationSequence.count();
  return { seeded: created > 0, created, count };
};

export const triggerSequence = async (eventName, userId, data = {}) => {
  const { AutomationSequence, AutomationLog, User } = getModels();

  const sequences = await AutomationSequence.findAll({
    where: { triggerEvent: eventName, isActive: true }
  });

  if (!sequences.length) {
    return { success: false, message: 'No active sequences for event', created: 0 };
  }

  const parsedLeadId = Number(data.leadId);
  const leadId = Number.isInteger(parsedLeadId) && parsedLeadId > 0 ? parsedLeadId : null;
  const user = userId ? await User.findByPk(userId) : null;

  // Lead-nurture path: when there is no User, resolve the recipient from a captured Lead.
  let lead = null;
  if (!user && leadId) {
    const { default: Lead } = await import('../models/Lead.mjs');
    lead = await Lead.findByPk(leadId);
  }

  // Key the user/lead identity off the RESOLVED user, not the raw param: a userId that
  // doesn't resolve (e.g. a soft-deleted account) must NOT stamp userId — otherwise the
  // log would carry BOTH userId and leadId, breaking the user-XOR-lead invariant the
  // recipient-resolution + frequency-cap layers depend on.
  const resolvedUserId = user ? user.id : null;
  const recipient = user?.phone || lead?.phone || lead?.email || null;
  const variables = {
    clientName: data.clientName || user?.firstName || lead?.firstName || 'Client',
    trainerName: data.trainerName || '',
    time: data.time || '',
    message: data.message || ''
  };

  const now = new Date();
  const logs = [];

  sequences.forEach((sequence) => {
    const steps = Array.isArray(sequence.steps) ? sequence.steps : [];
    steps.forEach((step, index) => {
      const dayOffset = Number(step.dayOffset) || 0;
      const scheduledFor = new Date(now);
      scheduledFor.setDate(scheduledFor.getDate() + dayOffset);

      logs.push({
        sequenceId: sequence.id,
        userId: resolvedUserId,
        leadId: resolvedUserId ? null : leadId, // user XOR lead — keyed off the RESOLVED user
        stepIndex: index,
        channel: step.channel || 'sms',
        status: 'pending',
        scheduledFor,
        templateName: step.templateName || null,
        recipient,
        payloadJson: {
          variables,
          context: data
        }
      });
    });
  });

  if (logs.length) {
    await AutomationLog.bulkCreate(logs);
  }

  return { success: true, created: logs.length };
};

export const processScheduledMessages = async ({ force = false } = {}) => {
  // Arm gate at the SEND CHOKEPOINT: disarmed => zero delivery, regardless of caller.
  // The scheduler only starts when armed, but the admin POST /api/automation/process
  // route calls this directly — without this gate it would flush+send the live pending
  // queue while the owner believes the engine is disarmed. `force` is a deliberate
  // in-code owner override; it is intentionally NOT exposed through any HTTP route.
  if (!isAutomationArmed() && !force) {
    return { processed: 0, results: [], skipped: 'disarmed' };
  }

  const { AutomationLog, User } = getModels();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - CLAIM_STALE_MS);

  // Candidates: matured pending logs PLUS any 'processing' log stranded by a crashed
  // mid-send (claimed longer ago than the stale threshold) so it can be retried instead
  // of stuck forever (and stop permanently counting against its recipient's cap).
  const candidateLogs = await AutomationLog.findAll({
    where: {
      scheduledFor: { [Op.lte]: now },
      [Op.or]: [
        { status: 'pending' },
        { status: 'processing', updatedAt: { [Op.lt]: staleBefore } },
      ],
    },
    limit: 200
  });

  const results = [];

  for (const log of candidateLogs) {
    try {
      // Atomically CLAIM the log before doing anything else: flip to 'processing' only if
      // it is STILL in the exact state we read (status + updatedAt optimistic lock). If 0
      // rows update, a concurrent runner (another cron tick / admin /process / another
      // Render instance) already claimed it -> skip. This is what prevents double-sending
      // the same log; counting 'processing' in resolveFrequencyCap keeps the cap safe too.
      const [claimedCount] = await AutomationLog.update(
        { status: 'processing' },
        { where: { id: log.id, status: log.status, updatedAt: log.updatedAt } }
      );
      if (claimedCount === 0) {
        results.push({ id: log.id, status: 'skipped_claimed' });
        continue;
      }

      const target = await resolveAutomationTarget(log, { User });
      const suppression = await resolveChannelSuppression(log, target);
      const frequency = await resolveFrequencyCap(log, { AutomationLog }, now, target);
      const decision = evaluateScheduledMessage(log, target, now, suppression, frequency);

      if (decision.action === 'cancel') {
        log.status = 'cancelled';
        log.error = reasonMessage(decision.reason, 'Message cancelled');
        await log.save();
        results.push({ id: log.id, status: 'cancelled' });
        continue;
      }

      if (decision.action === 'defer') {
        log.status = 'pending';
        if (typeof log.changed === 'function') {
          log.changed('status', true);
        }
        log.scheduledFor = decision.nextAttempt;
        await log.save();
        results.push({ id: log.id, status: 'deferred' });
        continue;
      }

      if (decision.action === 'fail') {
        // A transient consent-lookup failure (suppression_unverified) is INFRA, not structural —
        // DEFER + retry rather than permanently drop a valid message ("defer, never drop"). The
        // fail-closed safety holds: nothing is sent while consent is unverified.
        if (decision.reason === 'suppression_unverified') {
          log.status = 'pending';
          if (typeof log.changed === 'function') log.changed('status', true);
          log.scheduledFor = new Date(now.getTime() + FREQ_COOLDOWN_HOURS * 60 * 60 * 1000);
          log.error = 'deferred: suppression_unverified';
          await log.save();
          results.push({ id: log.id, status: 'deferred' });
          continue;
        }
        log.status = 'failed';
        log.error = reasonMessage(decision.reason, 'Send failed');
        await log.save();
        results.push({ id: log.id, status: 'failed' });
        continue;
      }

      const variables = log.payloadJson?.variables || {};
      const isEmail = decision.channel === 'email';
      const address = isEmail ? target.email : target.phone;

      let sendResult;
      if (isEmail) {
        // Email channel: templated nurture email to an (often phone-less) email lead.
        // Merge in per-lead CAN-SPAM vars (signed unsubscribe URL + consult CTA + address);
        // a missing unsubscribe URL makes sendTemplatedEmail fail CLOSED (never sends).
        sendResult = log.templateName
          ? await sendTemplatedEmail({
              to: address,
              templateName: log.templateName,
              variables: { ...variables, ...buildNurtureEmailVars({ leadId: log.leadId, clientName: variables.clientName }) },
            })
          : { success: false, error: 'No template provided for email channel' };
        if (sendResult?.body) log.message = sendResult.body;
      } else if (log.templateName) {
        sendResult = await sendTemplatedSMS({ to: address, templateName: log.templateName, variables });
        if (sendResult?.body) log.message = sendResult.body;
      } else if (log.message) {
        sendResult = await sendSmsMessage({ to: address, body: log.message });
      } else {
        sendResult = { success: false, error: 'No template or message provided' };
      }

      // Config/compliance errors are ENV-FIXABLE (Sean sets SWAN_BUSINESS_ADDRESS / unsubscribe
      // secret) so they DEFER instead of permanently burning the matured log. A missing unsubscribe
      // URL is env-fixable only for a LEAD (has an id to sign); for a USER email log it is structural
      // (no lead token possible) and stays terminal.
      const configRetryable = isEmail && !sendResult.success && (
        sendResult.error === 'missing_business_address'
        || (sendResult.error === 'missing_unsubscribe_url' && log.leadId)
        || sendResult.retryable === true // transient SendGrid 429/5xx/network — defer, never drop
      );

      if (sendResult.success) {
        log.status = 'sent';
        log.sentAt = new Date();
        log.recipient = address;
        log.error = null;
      } else if (configRetryable) {
        log.status = 'pending';
        if (typeof log.changed === 'function') log.changed('status', true);
        log.scheduledFor = new Date(now.getTime() + FREQ_COOLDOWN_HOURS * 60 * 60 * 1000);
        log.error = `deferred: ${sendResult.error}`;
        log.recipient = address;
      } else {
        log.status = 'failed';
        // SMS (twilio) may return a raw Error object; coerce to a string so the TEXT column
        // never stores "[object Object]".
        log.error = (typeof sendResult.error === 'string' ? sendResult.error : sendResult.error?.message)
          || (isEmail ? 'Email send failed' : 'SMS send failed');
        log.recipient = address;
      }

      await log.save();
      results.push({ id: log.id, status: log.status === 'pending' ? 'deferred' : log.status });
    } catch (error) {
      logger.error('Error processing automation log:', error);
      // Guard the recovery save: if persisting the failure status itself rejects (likely
      // the SAME DB/connection problem that caused the original error), it must NOT escape
      // the loop and abandon the rest of the batch — preserve per-log isolation.
      try {
        log.status = 'failed';
        log.error = error.message;
        await log.save();
      } catch (saveErr) {
        logger.error(`Failed to persist failure status for automation log ${log.id}: ${saveErr?.message}`);
      }
      results.push({ id: log.id, status: 'failed' });
    }
  }

  return { processed: results.length, results };
};

/**
 * Dry-run: what WOULD processScheduledMessages do right now? NO sends, NO DB
 * mutation — runs the SAME send/suppress decision logic (evaluateScheduledMessage).
 * NOTE: candidate selection differs slightly — the preview lists status:'pending' only,
 * while a live tick ALSO reclaims stale 'processing' logs after a crash, so the preview can
 * under-report those. PII-safe: reports phone PRESENCE only, never the number. Inspect
 * BEFORE arming SWAN_AUTOMATION_CRON_ENABLED.
 */
export const previewScheduledMessages = async ({ limit = 200 } = {}) => {
  const { AutomationLog, User } = getModels();
  const now = new Date();

  const pendingLogs = await AutomationLog.findAll({
    where: {
      status: 'pending',
      scheduledFor: { [Op.lte]: now }
    },
    limit
  });

  const summary = { wouldSend: 0, wouldDefer: 0, wouldCancel: 0, wouldFail: 0 };
  const bucketFor = { send: 'wouldSend', defer: 'wouldDefer', cancel: 'wouldCancel', fail: 'wouldFail' };
  const byReason = {};
  const items = [];

  for (const log of pendingLogs) {
    const target = await resolveAutomationTarget(log, { User });
    const suppression = await resolveChannelSuppression(log, target);
    const frequency = await resolveFrequencyCap(log, { AutomationLog }, now, target);
    const decision = evaluateScheduledMessage(log, target, now, suppression, frequency);
    summary[bucketFor[decision.action]] += 1;
    byReason[decision.reason] = (byReason[decision.reason] || 0) + 1;
    items.push({
      id: log.id,
      userId: log.userId || null,
      leadId: log.leadId || null,
      recipientKind: target?.kind || 'none',
      channel: decision.channel,
      templateName: log.templateName || null,
      action: decision.action,
      reason: decision.reason,
      hasPhone: Boolean(target?.phone),       // PII-safe: presence only, never the number
      suppressed: Boolean(suppression?.suppressed), // PII-safe boolean
      frequencyCapped: Boolean(frequency?.capped),
      sentInWindow: frequency?.sentInWindow ?? 0, // count, not PII
    });
  }

  return { dryRun: true, total: pendingLogs.length, summary, byReason, items };
};

export const cancelSequence = async (userId, sequenceName) => {
  const { AutomationSequence, AutomationLog } = getModels();

  const sequence = await AutomationSequence.findOne({ where: { name: sequenceName } });
  if (!sequence) {
    return { success: false, message: 'Sequence not found' };
  }

  const [updatedCount] = await AutomationLog.update(
    { status: 'cancelled' },
    {
      where: {
        sequenceId: sequence.id,
        userId,
        status: 'pending'
      }
    }
  );

  return { success: true, updatedCount };
};

export { evaluateScheduledMessage, sendNurtureTestMessage };

export default {
  ensureDefaultSequences,
  triggerSequence,
  evaluateScheduledMessage,
  processScheduledMessages,
  previewScheduledMessages,
  sendNurtureTestMessage,
  cancelSequence
};
