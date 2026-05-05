/**
 * PlaudWebhookNonce Model
 * ========================
 * Atomic-claim nonce store for incoming PLAUD webhook events.
 *
 * Phase 5 Slice 5.1 (2026-05-04). Plan: PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md §7.2.
 *
 * Composite primary key (source, nonce) per Codex CR-2 — source-scoped so
 * v2's additional webhook sources (e.g. official Plaud OAuth webhooks)
 * cannot collide with Applaud nonces.
 *
 * Insertion is ALWAYS via raw SQL `INSERT ... ON CONFLICT DO NOTHING
 * RETURNING nonce` — see backend/services/plaudWebhookSignature.mjs
 * (Slice 5.2). The model is here primarily for representation, the
 * cleanup cron (plaudCronJobs.mjs), and tests. SELECT-then-INSERT is
 * forbidden — would defeat the atomic dedup gate (Codex CR-2).
 *
 * Cleanup: 60-second cron deletes rows where expires_at < NOW().
 * Index idx_plaud_webhook_nonces_expires_at supports it.
 *
 * TTL: 600 seconds (matches the timestamp window in §4.2 step 2 — any
 * webhook with a timestamp older than 5 minutes is rejected anyway, so
 * a nonce expiring after 10 minutes is conservative).
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class PlaudWebhookNonce extends Model {}

PlaudWebhookNonce.init(
  {
    source: {
      type: DataTypes.STRING(32),
      primaryKey: true,
      allowNull: false,
      // Currently only 'applaud_webhook'. v2 will add 'plaud_oauth_webhook'.
      validate: { isIn: [['applaud_webhook']] },
    },
    nonce: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      allowNull: false,
    },
    receivedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'received_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
  },
  {
    sequelize,
    modelName: 'PlaudWebhookNonce',
    tableName: 'plaud_webhook_nonces',
    timestamps: false,
    paranoid: false,
  },
);

export default PlaudWebhookNonce;
