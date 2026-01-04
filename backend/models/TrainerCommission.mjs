// backend/models/TrainerCommission.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class TrainerCommission extends Model {}

TrainerCommission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'order_id',
    },
    trainerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'trainer_id',
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'client_id',
    },
    packageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'package_id',
    },
    leadSource: {
      type: DataTypes.ENUM('platform', 'trainer_brought', 'resign'),
      allowNull: false,
      field: 'lead_source',
    },
    isLoyaltyBump: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'is_loyalty_bump',
    },
    sessionsGranted: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'sessions_granted',
    },
    sessionsConsumed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      field: 'sessions_consumed',
    },
    grossAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'gross_amount',
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false,
      field: 'tax_amount',
    },
    netAfterTax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'net_after_tax',
    },
    commissionRateBusiness: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      field: 'commission_rate_business',
    },
    commissionRateTrainer: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      field: 'commission_rate_trainer',
    },
    businessCut: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'business_cut',
    },
    trainerCut: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'trainer_cut',
    },
    paidToTrainerAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'paid_to_trainer_at',
    },
    payoutMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'payout_method',
    },
    payoutReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'payout_reference',
    },
  },
  {
    sequelize,
    modelName: 'TrainerCommission',
    tableName: 'trainer_commissions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default TrainerCommission;
