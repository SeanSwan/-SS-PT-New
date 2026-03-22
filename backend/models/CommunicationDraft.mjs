/**
 * ============================================================================
 * FILE: CommunicationDraft.mjs
 * PURPOSE: Draft-and-approve queue for AI-generated email/SMS communications
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22 (CRITICAL security mandate)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Stores communication drafts created by the AI assistant.
 * AI NEVER sends email/SMS directly — it creates a draft that a trainer/admin
 * must review and approve before the message is actually sent.
 *
 * HOW IT FITS IN THE APP: AI Assistant → CommunicationDraft (pending) → Trainer approves → Email/SMS sent
 * KEY DECISIONS: Draft-and-approve pattern mandated by AI Village security audit (CRITICAL finding)
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class CommunicationDraft extends Model {}

CommunicationDraft.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // ─────────────────────────────────────────────────────────────
    // SECTION: Communication type and targeting
    // ─────────────────────────────────────────────────────────────
    type: {
      type: DataTypes.ENUM('email', 'sms'),
      allowNull: false,
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
    },
    trainerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
    },
    // ─────────────────────────────────────────────────────────────
    // SECTION: Message content
    // PURPOSE: Subject + body, sanitized by DOMPurify before storage
    // ─────────────────────────────────────────────────────────────
    subject: {
      type: DataTypes.STRING(200),
      allowNull: true, // SMS has no subject
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    recipientAddress: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Email address or phone number — auto-populated from client profile, NOT AI-controlled',
    },
    // ─────────────────────────────────────────────────────────────
    // SECTION: Approval workflow
    // ─────────────────────────────────────────────────────────────
    status: {
      type: DataTypes.ENUM('pending_approval', 'approved', 'sent', 'rejected'),
      allowNull: false,
      defaultValue: 'pending_approval',
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'CommunicationDraft',
    tableName: 'CommunicationDrafts',
    timestamps: true,
    indexes: [
      { fields: ['trainerId', 'status'] },
      { fields: ['clientId'] },
      { fields: ['status'] },
    ],
  }
);

export default CommunicationDraft;
