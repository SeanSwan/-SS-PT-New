/**
 * SERVICE: Marketing Readiness
 * ============================
 * Read-only truth surface for the admin Marketing Command Center. Aggregates the
 * REAL operational state of every marketing subsystem — social publishing, outbound
 * automation, email/newsletter, lead capture, calendar — plus an honest "labs/demo"
 * flag for the content tools that are not yet backed by live data. This is what turns
 * the Marketing tab from theater into an honest cockpit (GPT Pro plan, Slice 1).
 *
 * PRINCIPLES
 *  - READ ONLY. No sends, no mutations, no arming. Pure aggregation over existing
 *    services/models. Nothing here can publish, email, SMS, or flip a switch.
 *  - Rule 8 / Rule 59: counts + booleans ONLY. Never surfaces PII (names, emails,
 *    phones, lead/subscriber rows) and never a secret VALUE — env presence is reported
 *    as a boolean (`Boolean(process.env.X)`), never the key itself.
 *  - Fail-soft: each subsystem is independently try/caught so one unavailable
 *    dependency (e.g. missing migration) degrades that one card, not the whole endpoint.
 *  - Dependency-injectable (models/publisher/armedCheck/env) so it unit-tests without a DB.
 */

import { Op } from 'sequelize';
import { getAllModels } from '../models/index.mjs';
import nativePublisher, { PROVIDER_CAPABILITIES } from './nativeSocialPublishingService.mjs';
import { isAutomationArmed } from './automationArmState.mjs';
import logger from '../utils/logger.mjs';
// STATUS/SEVERITY/rollup lifted to their own module 2026-08-14 so subsystem
// builders can live in separate files without importing back into this one.
import { STATUS, rollup } from './marketingReadiness/readinessStatus.mjs';
import { buildSpeedToLeadReadiness } from './marketingReadiness/speedToLeadReadiness.mjs';

export function createMarketingReadinessService({
  models = null,
  publisher = nativePublisher,
  armedCheck = isAutomationArmed,
  env = process.env,
} = {}) {
  const resolveModels = () => models || getAllModels();

  // ─── Social publishing ───────────────────────────────────────────
  const buildSocial = async () => {
    try {
      const [health, accounts] = await Promise.all([
        publisher.getHealth(),
        Promise.resolve().then(() => publisher.listAccounts()).catch(() => []),
      ]);
      const connectedByProvider = {};
      for (const a of accounts) {
        if (a?.status === 'connected') {
          connectedByProvider[a.provider] = (connectedByProvider[a.provider] || 0) + 1;
        }
      }
      const providers = PROVIDER_CAPABILITIES.map((p) => ({
        id: p.id,
        name: p.name,
        implementationStatus: p.implementationStatus,
        usable: p.implementationStatus === 'available',
        connected: connectedByProvider[p.id] || 0,
      }));
      const connectedAccounts = accounts.filter((a) => a?.status === 'connected').length;
      const encryptionConfigured = Boolean(health?.encryption);

      let status = STATUS.READY;
      let nextAction = null;
      if (!encryptionConfigured) {
        status = STATUS.BLOCKED;
        nextAction = 'Set SOCIAL_TOKEN_ENCRYPTION_KEY_ID + SOCIAL_TOKEN_ENCRYPTION_KEY_<ID> before connecting accounts.';
      } else if (connectedAccounts === 0) {
        status = STATUS.DEGRADED;
        nextAction = 'Connect a Bluesky account (the only fully-native provider today) to start publishing.';
      }

      return {
        status,
        encryptionConfigured,
        connectedAccounts,
        schedulerEnabled: Boolean(health?.scheduler?.enabled),
        providers,
        note: 'Only Bluesky is fully native today. YouTube/Facebook/Instagram need OAuth; TikTok needs Content-Posting approval; Nextdoor needs partner access.',
        nextAction,
      };
    } catch (err) {
      logger.warn('[marketingReadiness] social subsystem unavailable:', err?.message);
      return { status: STATUS.DEGRADED, error: 'social publishing state unavailable', nextAction: 'Check native social publishing storage / migration.' };
    }
  };

  // ─── Outbound automation (default-OFF is the SAFE state, not an error) ───
  const buildAutomation = async () => {
    try {
      const m = resolveModels();
      const AutomationSequence = m?.AutomationSequence;
      const AutomationLog = m?.AutomationLog;
      const armed = Boolean(armedCheck(env));

      let activeSequences = 0;
      let leadNurtureActive = false;
      let pendingScheduled = 0;
      if (AutomationSequence) {
        activeSequences = await AutomationSequence.count({ where: { isActive: true } });
        const nurture = await AutomationSequence.findOne({ where: { name: 'lead_nurture' }, attributes: ['isActive'] });
        leadNurtureActive = Boolean(nurture?.isActive);
      }
      if (AutomationLog) {
        pendingScheduled = await AutomationLog.count({ where: { status: 'pending' } });
      }

      return {
        status: STATUS.READY,
        armed,
        cronEnvConfigured: Boolean(env?.SWAN_AUTOMATION_CRON_ENABLED),
        activeSequences,
        leadNurtureActive,
        pendingScheduled,
        emailSenderBuilt: false,
        note: armed
          ? 'Outbound automation is ARMED — sends can fire. Verify preview + suppression before every campaign.'
          : 'Disarmed by default (safe). lead_nurture is intentionally inactive; email-channel sender not built yet.',
        nextAction: null,
      };
    } catch (err) {
      logger.warn('[marketingReadiness] automation subsystem unavailable:', err?.message);
      return { status: STATUS.DEGRADED, armed: false, error: 'automation state unavailable' };
    }
  };

  // ─── Email / newsletter ──────────────────────────────────────────
  const buildEmail = async () => {
    try {
      const m = resolveModels();
      const Subscriber = m?.Subscriber;
      let confirmedSubscribers = 0;
      let pendingSubscribers = 0;
      let unsubscribed = 0;
      if (Subscriber) {
        [confirmedSubscribers, pendingSubscribers, unsubscribed] = await Promise.all([
          Subscriber.count({ where: { status: 'confirmed' } }),
          Subscriber.count({ where: { status: 'pending' } }),
          Subscriber.count({ where: { status: 'unsubscribed' } }),
        ]);
      }
      const sendgridConfigured = Boolean(env?.SENDGRID_API_KEY);
      return {
        status: sendgridConfigured ? STATUS.READY : STATUS.BLOCKED,
        sendgridConfigured,
        confirmedSubscribers,
        pendingSubscribers,
        unsubscribed,
        broadcastBuilt: false,
        note: 'Double opt-in capture is live. Broadcast / campaign send is a separate deliverability-isolated slice (not built).',
        nextAction: sendgridConfigured ? null : 'Set SENDGRID_API_KEY to enable confirmation + transactional email.',
      };
    } catch (err) {
      logger.warn('[marketingReadiness] email subsystem unavailable:', err?.message);
      return { status: STATUS.DEGRADED, error: 'subscriber state unavailable' };
    }
  };

  // ─── Lead capture ────────────────────────────────────────────────
  const buildLeadCapture = async () => {
    try {
      const m = resolveModels();
      const Lead = m?.Lead;
      const totalLeads = Lead ? await Lead.count() : 0;
      return {
        status: STATUS.READY,
        totalLeads,
        capturePoints: { contact: true, signup: true, newsletter: true, checkout: true },
        note: 'Lead capture is wired to contact, signup, newsletter-confirm, and paid checkout (best-effort, non-blocking).',
        nextAction: null,
      };
    } catch (err) {
      logger.warn('[marketingReadiness] lead subsystem unavailable:', err?.message);
      return { status: STATUS.DEGRADED, error: 'lead state unavailable' };
    }
  };

  // ─── Calendar ────────────────────────────────────────────────────
  const buildCalendar = async () => {
    try {
      const m = resolveModels();
      const MarketingCalendarItem = m?.MarketingCalendarItem;
      let totalItems = 0;
      let upcoming = 0;
      if (MarketingCalendarItem) {
        totalItems = await MarketingCalendarItem.count();
        upcoming = await MarketingCalendarItem.count({
          where: { status: 'scheduled', scheduledAt: { [Op.gt]: new Date() } },
        });
      }
      return {
        status: STATUS.READY,
        totalItems,
        upcoming,
        note: 'Marketing calendar is persisted with PT-schedule conflict advisories.',
        nextAction: null,
      };
    } catch (err) {
      logger.warn('[marketingReadiness] calendar subsystem unavailable:', err?.message);
      return { status: STATUS.DEGRADED, error: 'calendar state unavailable' };
    }
  };

  // ─── Campaigns (spine registry count) ────────────────────────────
  const buildCampaigns = async () => {
    try {
      const m = resolveModels();
      const MarketingCampaign = m?.MarketingCampaign;
      let totalCampaigns = 0;
      let activeCampaigns = 0;
      if (MarketingCampaign) {
        totalCampaigns = await MarketingCampaign.count();
        activeCampaigns = await MarketingCampaign.count({ where: { status: 'active' } });
      }
      return {
        status: STATUS.READY,
        totalCampaigns,
        activeCampaigns,
        note: totalCampaigns === 0
          ? 'No campaigns yet — the spine is ready; create one in the Overview.'
          : `${activeCampaigns} active of ${totalCampaigns} total.`,
        nextAction: totalCampaigns === 0 ? 'Create your first campaign to organize marketing work.' : null,
      };
    } catch (err) {
      logger.warn('[marketingReadiness] campaigns subsystem unavailable:', err?.message);
      return { status: STATUS.DEGRADED, error: 'campaign state unavailable' };
    }
  };

  // ─── Content tools (honest labs/demo flag) ───────────────────────
  const buildContentTools = () => ({
    status: STATUS.DEMO,
    tools: [
      { id: 'seo', label: 'SEO Audit', mode: 'demo' },
      { id: 'keywords', label: 'Keyword Research', mode: 'demo' },
      { id: 'blog', label: 'Blog Writer', mode: 'demo' },
      { id: 'competitors', label: 'Competitor Analysis', mode: 'demo' },
      { id: 'emailDigest', label: 'Email Digest Builder', mode: 'demo' },
    ],
    note: 'Labs / demo — these panels render sample data and are not backed by live APIs yet.',
    nextAction: 'Wire to real persistence in a later slice, or keep clearly badged as demo.',
  });

  const getReadiness = async () => {
    const [socialPublishing, automation, email, leadCapture, calendar, campaigns] = await Promise.all([
      buildSocial(),
      buildAutomation(),
      buildEmail(),
      buildLeadCapture(),
      buildCalendar(),
      buildCampaigns(),
    ]);
    // Pure env reads — synchronous, no DB, so they stay out of the Promise.all.
    const contentTools = buildContentTools();
    const speedToLead = buildSpeedToLeadReadiness({ env, logger });
    // speedToLead IS operational (unlike contentTools) so it moves the rollup:
    // an armed-but-broken sender is exactly the alarm this cockpit exists for.
    const overall = rollup([socialPublishing, automation, email, leadCapture, calendar, campaigns, speedToLead]);
    return {
      overall,
      generatedAt: new Date().toISOString(),
      subsystems: { socialPublishing, automation, email, speedToLead, leadCapture, calendar, campaigns, contentTools },
    };
  };

  return { getReadiness };
}

const defaultService = createMarketingReadinessService();
export const getMarketingReadiness = () => defaultService.getReadiness();

export default { createMarketingReadinessService, getMarketingReadiness, STATUS };
