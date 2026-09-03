/**
 * TrainerApplication — self-serve trainer onboarding submission + contract e-sign evidence.
 * ============================================================================
 * One row per trainer onboarding application. Captures the trainer's professional
 * info, credential/insurance references, and a legally-relevant e-signature evidence
 * snapshot (base64 signature + IP + userAgent + contract version + textHash + timestamp),
 * mirroring the proven WaiverRecord e-sign pattern (WaiverRecord.mjs).
 *
 * FAIL-CLOSED: status defaults to 'pending_review'. An application does NOT grant any
 * trainer capability. An admin manually verifies insurance + certifications, then approval
 * flips User.role='trainer' + User.trainerType='independent' (done in the controller/admin
 * action, NOT here). Stripe Connect payout wiring is a SEPARATE future slice — this model
 * only holds a nullable stripeAccountId placeholder for that slice to populate.
 *
 * PRIVACY (rule 8): stores trainer-supplied business/professional data + a signature image.
 * Does NOT store SSN/EIN/bank details — those live only in Stripe's embedded onboarding
 * (future slice). COI/credential files are encrypted by trainerCredentialStorageService
 * before private storage and are referenced here only by owner-scoped opaque keys.
 *
 * @module models/TrainerApplication
 */
import { DataTypes, Model, Op } from 'sequelize';
import sequelize from '../database.mjs';

class TrainerApplication extends Model {}

TrainerApplication.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // The authenticated user submitting the application. FK references "Users" (PascalCase table — project gotcha).
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    // ── Applicant identity (display copy; canonical identity stays on User) ──
    fullName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 200] },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { isEmail: true, notEmpty: true },
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    // ── Professional information (mirrors User trainer columns for later copy on approval) ──
    businessName: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    specialties: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Trainer specialties/focus areas (free text)',
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    yearsExperience: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0, max: 80 },
    },
    // ── Credentials (verified manually by admin before approval) ──
    primaryCertification: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'e.g. NASM, ACE, ACSM, NSCA',
    },
    certificationNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    certificationExpiry: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    cprAedExpiry: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // Owner-scoped encrypted private-storage key for the credential/cert document.
    certificationFileKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    // ── Insurance (self-insured model; verified with insurer before approval) ──
    insuranceCarrier: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    insurancePolicyNumber: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    insuranceExpiry: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // Owner-scoped encrypted private-storage key for the Certificate of Insurance.
    insuranceFileKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    // Trainer attests SwanStudios is named additional insured (verified from COI by admin)
    additionalInsuredAttested: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // ── Contract e-sign evidence (mirrors WaiverRecord pattern) ──
    contractVersion: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Version identifier of the trainer agreement text that was signed',
    },
    // Base64 PNG data-URL from SignaturePad (reused component)
    signatureData: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true },
    },
    signedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Consent checkboxes the trainer affirmed (IC status, self-insure, indemnify, fee, conduct)
    consentFlags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    // ── Revenue share snapshot (recorded at signing; the number they agreed to) ──
    platformFeePercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 15.0,
      comment: 'Platform fee % of gross the trainer agreed to at signing',
    },
    // ── Lifecycle (FAIL-CLOSED) ──
    status: {
      type: DataTypes.ENUM('pending_review', 'approved', 'rejected', 'withdrawn', 'suspended'),
      allowNull: false,
      defaultValue: 'pending_review',
    },
    reviewedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // ── Stripe Connect placeholder — populated by the FUTURE payout slice, not this one ──
    stripeAccountId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Stripe Connect Express account id — set by the future payout-wiring slice, null now',
    },
    // Evidence snapshot: displayed contract, body/package hashes, submission time, and source.
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'TrainerApplication',
    tableName: 'trainer_applications',
    timestamps: true,
    indexes: [
      { fields: ['userId'], name: 'trainer_applications_userId' },
      { fields: ['status'], name: 'trainer_applications_status' },
      { fields: ['email'], name: 'trainer_applications_email' },
      {
        fields: ['userId'],
        name: 'trainer_applications_one_active_per_user',
        unique: true,
        where: { status: { [Op.in]: ['pending_review', 'approved', 'suspended'] } },
      },
    ],
  },
);

TrainerApplication.associate = (models) => {
  TrainerApplication.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'applicant',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });
  TrainerApplication.belongsTo(models.User, {
    foreignKey: 'reviewedBy',
    as: 'reviewer',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
  TrainerApplication.hasMany(models.TrainerCredentialUpload, {
    foreignKey: 'attachedApplicationId',
    as: 'credentialUploads',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });
};

export default TrainerApplication;
