import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class WaiverRecord extends Model {}

WaiverRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    fullName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200],
      },
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
      set(value) {
        // Normalize blank to null so isEmail skips and DB CHECK treats as absent
        this.setDataValue('email', (typeof value === 'string' && value.trim() === '') ? null : value);
      },
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending_match', 'linked', 'superseded', 'revoked'),
      allowNull: false,
      defaultValue: 'pending_match',
    },
    source: {
      type: DataTypes.ENUM('qr', 'header_waiver', 'admin_tablet', 'in_app'),
      allowNull: false,
      defaultValue: 'qr',
    },
    activityTypes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    signatureData: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
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
    submittedByGuardian: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    guardianName: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    guardianTypedSignature: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'WaiverRecord',
    tableName: 'waiver_records',
    timestamps: true,
    validate: {
      emailOrPhoneRequired() {
        const hasEmail = typeof this.email === 'string' && this.email.trim().length > 0;
        const hasPhone = typeof this.phone === 'string' && this.phone.trim().length > 0;
        if (!hasEmail && !hasPhone) {
          throw new Error('At least one of email or phone is required');
        }
      },
    },
    indexes: [
      { fields: ['userId'], name: 'waiver_records_userId' },
      { fields: ['email'], name: 'waiver_records_email' },
      { fields: ['phone'], name: 'waiver_records_phone' },
      { fields: ['status'], name: 'waiver_records_status' },
      { fields: ['dateOfBirth', 'email'], name: 'waiver_records_dob_email' },
      { fields: ['dateOfBirth', 'phone'], name: 'waiver_records_dob_phone' },
    ],
  },
);

WaiverRecord.associate = (models) => {
  WaiverRecord.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
  });
  WaiverRecord.hasMany(models.WaiverRecordVersion, {
    foreignKey: 'waiverRecordId',
    as: 'versionLinks',
  });
  WaiverRecord.hasOne(models.WaiverConsentFlags, {
    foreignKey: 'waiverRecordId',
    as: 'consentFlags',
  });
  WaiverRecord.hasMany(models.PendingWaiverMatch, {
    foreignKey: 'waiverRecordId',
    as: 'pendingMatches',
  });
};

export default WaiverRecord;
