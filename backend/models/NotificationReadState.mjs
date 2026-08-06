/**
 * NotificationReadState.mjs
 * =========================
 * SWA-138 S4 — per-admin alert read/archive state (side table).
 *
 * One row per (admin, alert-ref). `readAt` = acked/seen by that admin;
 * `archivedAt` = hidden from that admin's Alerts view. Global resolution
 * lives on the SOURCE row (PostReport, AdminNotification…), never here.
 * refId is a string so computed alerts (stable finance ids) and integer PKs
 * both fit.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

export const ALERT_REF_TYPES = ['contact', 'finance', 'admin_notification', 'post_report'];

const NotificationReadState = db.define('NotificationReadState', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    comment: 'Admin this read-state row belongs to',
  },
  refType: {
    type: DataTypes.STRING(40),
    allowNull: false,
    validate: { isIn: [ALERT_REF_TYPES] },
    comment: 'Alert source class (contact | finance | admin_notification | post_report)',
  },
  refId: {
    type: DataTypes.STRING(160),
    allowNull: false,
    comment: 'Source row id or stable computed-alert id',
  },
  readAt: { type: DataTypes.DATE, allowNull: true },
  archivedAt: { type: DataTypes.DATE, allowNull: true },
  // SWA-138 S4b — claim chip. Read/archive stay per-admin; a CLAIM is the one
  // signal other admins must see, so it is queried across the whole table for
  // a given ref rather than scoped to the acting admin.
  claimedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'notification_read_state',
  timestamps: true,
  indexes: [
    { fields: ['adminId', 'refType', 'refId'], unique: true, name: 'notification_read_state_admin_ref_uq' },
  ],
});

export default NotificationReadState;
