import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';
import { resolveFollowUpAt } from '../utils/leadFollowUp.mjs';

class Lead extends Model {}

Lead.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // Contact info
    firstName: { type: DataTypes.STRING(100), allowNull: false, field: 'first_name' },
    lastName: { type: DataTypes.STRING(100), allowNull: true, field: 'last_name' },
    email: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(30), allowNull: true },

    // Lead source tracking
    source: {
      type: DataTypes.ENUM('gallery', 'walk_in', 'website', 'referral', 'social_media', 'other'),
      allowNull: false,
      defaultValue: 'other',
    },
    sourceDetail: { type: DataTypes.STRING(255), allowNull: true, field: 'source_detail' },
    // e.g., "Basketball Game March 2026" for gallery, "Gold's Gym Anaheim" for walk_in

    // Pipeline status
    status: {
      type: DataTypes.ENUM('new', 'contacted', 'qualified', 'scheduled', 'converted', 'lost'),
      allowNull: false,
      defaultValue: 'new',
    },

    // Lead scoring (0-100)
    score: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    // Scheduling link
    scheduledSessionId: { type: DataTypes.INTEGER, allowNull: true, field: 'scheduled_session_id' },

    // Conversion link (when they become a client)
    convertedUserId: { type: DataTypes.INTEGER, allowNull: true, field: 'converted_user_id' },

    // Gallery visitor link (if lead came from gallery)
    galleryVisitorId: { type: DataTypes.INTEGER, allowNull: true, field: 'gallery_visitor_id' },

    // Referrer (existing client who referred)
    referredByUserId: { type: DataTypes.INTEGER, allowNull: true, field: 'referred_by_user_id' },

    // AI spirit name for de-identified processing
    spiritName: { type: DataTypes.STRING(100), allowNull: true, field: 'spirit_name' },

    // Notes and metadata
    notes: { type: DataTypes.TEXT, allowNull: true },
    goals: { type: DataTypes.TEXT, allowNull: true },
    tags: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },

    // Communication tracking
    lastContactedAt: { type: DataTypes.DATE, allowNull: true, field: 'last_contacted_at' },
    nextFollowUpAt: { type: DataTypes.DATE, allowNull: true, field: 'next_follow_up_at' },
    contactCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'contact_count' },
    smsConsentStatus: {
      type: DataTypes.ENUM('unknown', 'opted_in', 'opted_out'),
      allowNull: false,
      defaultValue: 'unknown',
      field: 'sms_consent_status',
    },
    smsConsentAt: { type: DataTypes.DATE, allowNull: true, field: 'sms_consent_at' },
    smsConsentSource: { type: DataTypes.STRING(255), allowNull: true, field: 'sms_consent_source' },
    smsOptOutAt: { type: DataTypes.DATE, allowNull: true, field: 'sms_opt_out_at' },

    // Timestamps for pipeline tracking
    contactedAt: { type: DataTypes.DATE, allowNull: true, field: 'contacted_at' },
    qualifiedAt: { type: DataTypes.DATE, allowNull: true, field: 'qualified_at' },
    scheduledAt: { type: DataTypes.DATE, allowNull: true, field: 'scheduled_at' },
    convertedAt: { type: DataTypes.DATE, allowNull: true, field: 'converted_at' },
    lostAt: { type: DataTypes.DATE, allowNull: true, field: 'lost_at' },
    lostReason: { type: DataTypes.STRING(255), allowNull: true, field: 'lost_reason' },

    // Assigned trainer (for RBAC - trainers only see their assigned leads)
    assignedTrainerId: { type: DataTypes.INTEGER, allowNull: true, field: 'assigned_trainer_id' },
  },
  {
    sequelize,
    modelName: 'Lead',
    tableName: 'leads',
    timestamps: true,
    underscored: true,
    paranoid: true, // soft delete
    indexes: [
      { fields: ['status'] },
      { fields: ['source'] },
      { fields: ['email'] },
      { fields: ['score'] },
      { fields: ['assigned_trainer_id'] },
      { fields: ['next_follow_up_at'] },
      { fields: ['converted_user_id'] },
      { fields: ['gallery_visitor_id'] },
    ],
    hooks: {
      /**
       * P0-1 (SWA-29): set the initial follow-up SLA at capture so the "leads needing
       * follow-up" dashboard (leadRoutes.mjs:54 filter + :120 KPI) stops structurally
       * reporting ~0. Placed on the MODEL, not a single capture service, because a Rule-20
       * sibling sweep found 7 lead-create sites (contact form, signup, PRISM, consult,
       * checkout, gallery, admin) — a per-service edit would miss the highest-intent ones
       * (consult/checkout) and the dashboard would keep lying for exactly the leads that
       * matter most. Speed-to-lead: hot leads (score >= 70 — consult/booking/checkout
       * intent) get a 2h SLA; everyone else 24h. Only fills when null, so a caller (or the
       * admin PUT) that sets an explicit date is never overwritten.
       */
      beforeCreate: (lead) => {
        lead.nextFollowUpAt = resolveFollowUpAt(lead.nextFollowUpAt, lead.score);
      },
      /**
       * P0-4 (SWA-29): emit the canonical funnel events server-side from the model, so ALL
       * lead-create/convert paths feed the ONE funnel stream (MEASUREMENT-CHARTER.md) without
       * every caller remembering to. recordFunnelEvent is fail-soft (never throws) + writes on
       * its own connection, so a telemetry failure can never break or roll back lead capture /
       * conversion. Only non-identifying `source` is passed — NO name/email/id (Rule 8).
       */
      afterCreate: async (lead) => {
        const { recordFunnelEvent } = await import('../services/acquisitionTelemetry.mjs');
        await recordFunnelEvent('lead_captured', { source: lead.source });
        // A checkout creates a lead BORN converted (leadCaptureCheckout.mjs:68) — that path
        // fires afterCreate, not afterUpdate, so the converted event must be emitted here too
        // or the highest-value conversion goes uncounted (Rule-61 hostile-review catch).
        if (lead.status === 'converted') {
          await recordFunnelEvent('converted', { source: lead.source });
        }
      },
      afterUpdate: async (lead) => {
        // Existing-lead conversions go through instance .update() (leadCaptureCheckout.mjs:85,
        // leadRoutes.mjs admin PUT) → afterUpdate fires. Emit only on the transition INTO
        // converted so a later save of an already-converted lead never double-counts.
        if (lead.previous('status') !== 'converted' && lead.status === 'converted') {
          const { recordFunnelEvent } = await import('../services/acquisitionTelemetry.mjs');
          await recordFunnelEvent('converted', { source: lead.source });
        }
      },
    },
  }
);

export default Lead;
